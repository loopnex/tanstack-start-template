import type { UploadResult } from '#/components/system/file-uploader'

const CONCURRENCY = 4
const MAX_RETRIES = 3
const SIGN_BATCH = 10 // part URLs requested per sign-parts call

type Part = { partNumber: number; etag: string }

type SignSingle = { mode: 'single'; key: string; url: string }
type SignMultipart = {
  mode: 'multipart'
  key: string
  uploadId: string
  partSize: number
  partCount: number
}
type SignResponse = SignSingle | SignMultipart

export type UploadOptions = {
  collection?: string
  modelType?: string
  modelId?: string
  maxSize?: number // server caps at this (defaults to 100 MB when absent)
  signal?: AbortSignal
  onProgress?: (percent: number) => void
}

// Ask the server to sign the upload, then push bytes straight to S3.
export async function uploadFile(
  file: File,
  opts: UploadOptions = {},
): Promise<UploadResult> {
  const signed = (await postJson(
    '/api/upload/sign',
    {
      filename: file.name,
      collection: opts.collection,
      contentType: file.type,
      size: file.size,
      maxSize: opts.maxSize,
    },
    opts.signal,
  )) as SignResponse

  return signed.mode === 'multipart'
    ? uploadMultipart(file, opts, signed)
    : uploadSingle(file, opts, signed)
}

async function uploadSingle(
  file: File,
  opts: UploadOptions,
  signed: SignSingle,
): Promise<UploadResult> {
  await xhrPut(signed.url, file, {
    signal: opts.signal,
    // Must match the Content-Type the server signed — same octet-stream fallback.
    contentType: file.type || 'application/octet-stream',
    onLoaded: (loaded) => opts.onProgress?.(percent(loaded, file.size)),
  })
  return finalize(file, opts, { key: signed.key })
}

async function uploadMultipart(
  file: File,
  opts: UploadOptions,
  signed: SignMultipart,
): Promise<UploadResult> {
  const { signal, onProgress } = opts
  const { key, uploadId, partSize, partCount } = signed

  // Sign part URLs per batch on first use; the fetch is cached so workers share
  // it, and cleared on failure so the batch can retry.
  const urls = new Map<number, string>()
  const batches = new Map<number, Promise<void>>()
  const urlFor = async (partNumber: number): Promise<string> => {
    const cached = urls.get(partNumber)
    if (cached) return cached
    const batch = Math.floor((partNumber - 1) / SIGN_BATCH)
    if (!batches.has(batch)) {
      const from = batch * SIGN_BATCH + 1
      const partNumbers = Array.from(
        { length: Math.min(SIGN_BATCH, partCount - from + 1) },
        (_, i) => from + i,
      )
      const fetching = withRetry(
        () =>
          postJson(
            '/api/upload/sign-parts',
            { key, uploadId, partNumbers },
            signal,
          ) as Promise<{ parts: { partNumber: number; url: string }[] }>,
        signal,
      )
        .then((res) => {
          for (const p of res.parts) urls.set(p.partNumber, p.url)
        })
        .catch((err) => {
          batches.delete(batch)
          throw err
        })
      batches.set(batch, fetching)
    }
    await batches.get(batch)!
    return urls.get(partNumber)!
  }

  try {
    const loaded = new Array<number>(partCount).fill(0)
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
      while (next < partCount) {
        const i = next++
        const partNumber = i + 1
        const start = i * partSize
        const chunk = file.slice(start, Math.min(start + partSize, file.size))
        const { etag } = await withRetry(
          async () =>
            xhrPut(await urlFor(partNumber), chunk, {
              signal,
              onLoaded: (l) => {
                loaded[i] = l
                report()
              },
            }),
          signal,
        )
        if (!etag) throw new Error('Missing ETag (check S3 CORS ExposeHeaders)')
        loaded[i] = chunk.size
        report()
        parts.push({ partNumber, etag })
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, partCount) }, worker),
    )
    parts.sort((a, b) => a.partNumber - b.partNumber)

    return finalize(file, opts, { key, uploadId, parts })
  } catch (err) {
    // Best-effort: tell S3 to discard the parts. keepalive survives navigation.
    void fetch(
      `/api/upload/abort?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}`,
      { method: 'DELETE', keepalive: true },
    )
    throw err
  }
}

// Record the DB row; server reads the authoritative size/type from storage.
function finalize(
  file: File,
  opts: UploadOptions,
  extra: { key: string; uploadId?: string; parts?: Part[] },
): Promise<UploadResult> {
  return postJson(
    '/api/upload/complete',
    {
      key: extra.key,
      uploadId: extra.uploadId,
      parts: extra.parts,
      filename: file.name,
      modelType: opts.modelType,
      modelId: opts.modelId,
      maxSize: opts.maxSize,
    },
    opts.signal,
  ) as Promise<UploadResult>
}

// --- Helpers ---
const percent = (loaded: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0

const aborted = () => new DOMException('Aborted', 'AbortError')
const isAbort = (e: unknown) => (e as Error)?.name === 'AbortError'

// PUT via XHR for upload progress + abort; resolves the response ETag for parts.
function xhrPut(
  url: string,
  body: Blob,
  opts: {
    signal?: AbortSignal
    contentType?: string
    onLoaded?: (loaded: number) => void
  },
): Promise<{ etag: string | null }> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) return reject(aborted())
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    if (opts.contentType) xhr.setRequestHeader('content-type', opts.contentType)

    const onAbort = () => xhr.abort()
    opts.signal?.addEventListener('abort', onAbort, { once: true })
    const done = () => opts.signal?.removeEventListener('abort', onAbort)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onLoaded?.(e.loaded)
    }
    xhr.onload = () => {
      done()
      if (xhr.status >= 200 && xhr.status < 300)
        resolve({ etag: xhr.getResponseHeader('ETag') })
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
  if (!res.ok) {
    // Use the server's { error } message; fall back to the HTTP status code.
    const message = await res
      .json()
      .then((d) => (d as { error?: string })?.error)
      .catch(() => null)
    throw new Error(message || `Request failed (${res.status})`)
  }
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
