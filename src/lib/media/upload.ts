import type { UploadResult } from '#/components/system/file-uploader'

// ≤ threshold → one streaming PUT; above → multipart. Keep ≤ the account's
// Worker request-body limit (100 MB Free/Pro, 200 Business, 500 Enterprise).
const MULTIPART_THRESHOLD = 90 * 1024 * 1024
const PART_SIZE = 10 * 1024 * 1024 // ≥ R2's 5 MiB minimum
const CONCURRENCY = 4
const MAX_RETRIES = 3

type Part = { partNumber: number; etag: string }

export type UploadOptions = {
  collection?: string
  modelType?: string
  modelId?: string
  signal?: AbortSignal
  onProgress?: (percent: number) => void
}

// Upload a file to /api/upload, picking single vs multipart by size.
export function uploadFile(
  file: File,
  opts: UploadOptions = {},
): Promise<UploadResult> {
  return file.size > MULTIPART_THRESHOLD
    ? uploadMultipart(file, opts)
    : uploadSingle(file, opts)
}

async function uploadSingle(
  file: File,
  opts: UploadOptions,
): Promise<UploadResult> {
  const result = await xhrPut(`/api/upload/single?${query(file, opts)}`, file, {
    signal: opts.signal,
    contentType: file.type,
    onLoaded: (loaded) => opts.onProgress?.(percent(loaded, file.size)),
  })
  return result as UploadResult
}

async function uploadMultipart(
  file: File,
  opts: UploadOptions,
): Promise<UploadResult> {
  const { signal, onProgress } = opts
  const { key, uploadId } = (await postJson(
    '/api/upload/create',
    {
      filename: file.name,
      collection: opts.collection,
      contentType: file.type,
    },
    signal,
  )) as { key: string; uploadId: string }

  try {
    const total = Math.max(1, Math.ceil(file.size / PART_SIZE))
    const loaded = new Array<number>(total).fill(0)
    const report = () =>
      onProgress?.(
        percent(
          loaded.reduce((a, b) => a + b, 0),
          file.size,
        ),
      )

    const parts: Part[] = []
    let next = 0
    const worker = async () => {
      while (next < total) {
        const i = next++
        const start = i * PART_SIZE
        const chunk = file.slice(start, Math.min(start + PART_SIZE, file.size))
        const part = (await withRetry(
          () =>
            xhrPut(
              `/api/upload/part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${i + 1}`,
              chunk,
              {
                signal,
                onLoaded: (l) => {
                  loaded[i] = l
                  report()
                },
              },
            ),
          signal,
        )) as Part
        loaded[i] = chunk.size
        report()
        parts.push(part)
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, total) }, worker),
    )
    parts.sort((a, b) => a.partNumber - b.partNumber)

    const result = (await postJson(
      '/api/upload/complete',
      {
        key,
        uploadId,
        parts,
        filename: file.name,
        collection: opts.collection,
        modelType: opts.modelType,
        modelId: opts.modelId,
        mimeType: file.type,
        size: file.size,
      },
      signal,
    )) as UploadResult
    return result
  } catch (err) {
    // Best-effort: tell R2 to discard the parts. keepalive survives navigation.
    void fetch(
      `/api/upload/abort?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}`,
      { method: 'DELETE', keepalive: true },
    )
    throw err
  }
}

// --- helpers ---

function query(file: File, opts: UploadOptions) {
  const p = new URLSearchParams({
    filename: file.name,
    collection: opts.collection || 'default',
  })
  if (opts.modelType) p.set('modelType', opts.modelType)
  if (opts.modelId) p.set('modelId', opts.modelId)
  return p.toString()
}

const percent = (loaded: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0

const aborted = () => new DOMException('Aborted', 'AbortError')
const isAbort = (e: unknown) => (e as Error)?.name === 'AbortError'

// PUT via XHR so we get real upload progress and signal-based abort.
function xhrPut(
  url: string,
  body: Blob,
  opts: {
    signal?: AbortSignal
    contentType?: string
    onLoaded?: (loaded: number) => void
  },
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) return reject(aborted())
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.responseType = 'json'
    if (opts.contentType) xhr.setRequestHeader('content-type', opts.contentType)

    const onAbort = () => xhr.abort()
    opts.signal?.addEventListener('abort', onAbort, { once: true })
    const done = () => opts.signal?.removeEventListener('abort', onAbort)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onLoaded?.(e.loaded)
    }
    xhr.onload = () => {
      done()
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response)
      else reject(new Error(`Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => {
      done()
      reject(new Error('Network error'))
    }
    xhr.onabort = () => {
      done()
      reject(aborted())
    }
    xhr.send(body)
  })
}

async function postJson(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new Error(`${url} failed (${res.status})`)
  return res.json()
}

// Retry transient failures with backoff; never retry an abort.
async function withRetry<T>(
  fn: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw aborted()
    try {
      return await fn()
    } catch (err) {
      if (isAbort(err) || signal?.aborted) throw err
      lastErr = err
      if (attempt < MAX_RETRIES - 1) await delay(300 * 2 ** attempt, signal)
    }
  }
  throw lastErr
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(aborted())
      },
      { once: true },
    )
  })
}
