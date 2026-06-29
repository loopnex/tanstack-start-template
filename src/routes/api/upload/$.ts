import { media } from '#/db/schema'
import { db } from '#/lib/db'
import {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartUpload,
  deleteObject,
  headObject,
  objectPublicUrl,
  signParts,
  signPut,
  type UploadedPart,
} from '#/lib/media/s3'
import slugify from '@sindresorhus/slugify'
import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import path from 'node:path'
import { ulid } from 'ulid'

// ≤ threshold → one presigned PUT; above → multipart.
const MULTIPART_THRESHOLD = 100 * 1024 * 1024
const TARGET_PART_SIZE = 10 * 1024 * 1024 // ≥ S3's 5 MiB part minimum
const MAX_PARTS = 10_000 // S3 hard limit on parts per multipart upload

// Default ceiling; overridden per-upload by the <FileUploader maxSize> prop.
const DEFAULT_MAX_UPLOAD_SIZE = 100 * 1024 * 1024 // 100 MB

const COLLECTION_RE = /^[a-z0-9-]+$/
const json = (data: unknown, status = 200) => Response.json(data, { status })

// The action is the last path segment, e.g. /api/upload/sign.
const action = (url: URL) => url.pathname.split('/').filter(Boolean).pop() ?? ''

// {collection}/{slug}-{ulid} — extensionless so the dev static handler never
// grabs the read URL; Content-Type is read back from the stored object. Client
// input is never used raw as a path.
function buildKey(filename: string, collection: string) {
  const name = path.basename(filename, path.extname(filename))
  return `${collection}/${slugify(name, { decamelize: false }) || 'file'}-${ulid()}`
}

// Insert the DB row once an object exists; returns the public result.
async function record(args: {
  key: string
  name: string
  mimeType: string
  size: number
  collection: string
  modelType: string | null
  modelId: string | null
  // Media isn't tied to a user — null unless an authorized caller passes one
  userId: string | null
}) {
  const mediaId = ulid()
  // Browser-reachable storage URL (served directly from the bucket/CDN).
  const url = objectPublicUrl(args.key)
  await db.insert(media).values({
    id: mediaId,
    modelType: args.modelType,
    modelId: args.modelId,
    userId: args.userId,
    key: args.key,
    name: args.name,
    ext: path.extname(args.name).slice(1).toLowerCase(),
    mimeType: args.mimeType,
    size: args.size,
    collection: args.collection,
    url,
  })
  return {
    mediaId,
    key: args.key,
    url,
    name: args.name,
    mimeType: args.mimeType,
    size: args.size,
  }
}

// Hand back presigned URL(s) so the browser uploads bytes directly to S3.
async function sign(request: Request) {
  const body = (await request.json()) as {
    filename?: string
    collection?: string
    contentType?: string
    size?: number
    maxSize?: number
  }
  const collection = body.collection || 'default'
  if (!body.filename) return json({ error: 'filename required' }, 400)
  if (!COLLECTION_RE.test(collection))
    return json({ error: 'invalid collection' }, 400)
  if (typeof body.size !== 'number' || body.size < 0)
    return json({ error: 'invalid size' }, 400)
  if (body.size > (body.maxSize ?? DEFAULT_MAX_UPLOAD_SIZE))
    return json({ error: 'File too large' }, 413)

  const key = buildKey(body.filename, collection)
  const contentType = body.contentType || 'application/octet-stream'

  if (body.size <= MULTIPART_THRESHOLD) {
    return json({ mode: 'single', key, url: await signPut(key, contentType) })
  }

  const { uploadId } = await createMultipartUpload(key, contentType)
  // Scale the part size up for very large files so we never exceed MAX_PARTS.
  const partSize = Math.max(TARGET_PART_SIZE, Math.ceil(body.size / MAX_PARTS))
  const partCount = Math.ceil(body.size / partSize)
  return json({ mode: 'multipart', key, uploadId, partSize, partCount })
}

// Sign a batch of part URLs on demand, requested as the client reaches them.
async function signPartUrls(request: Request) {
  const body = (await request.json()) as {
    key?: string
    uploadId?: string
    partNumbers?: number[]
  }
  if (!body.key || !body.uploadId)
    return json({ error: 'key/uploadId required' }, 400)
  if (!COLLECTION_RE.test(body.key.split('/')[0]))
    return json({ error: 'invalid key' }, 400)
  if (!Array.isArray(body.partNumbers) || body.partNumbers.length === 0)
    return json({ error: 'partNumbers required' }, 400)
  if (
    body.partNumbers.some((n) => !Number.isInteger(n) || n < 1 || n > MAX_PARTS)
  )
    return json({ error: 'invalid partNumbers' }, 400)

  return json({
    parts: await signParts(body.key, body.uploadId, body.partNumbers),
  })
}

// Complete the MPU (if any), then record the row using storage's authoritative
// size/type, not the client's.
async function complete(request: Request) {
  const body = (await request.json()) as {
    key?: string
    uploadId?: string
    parts?: UploadedPart[]
    filename?: string
    modelType?: string
    modelId?: string
    maxSize?: number
  }
  if (!body.key) return json({ error: 'key required' }, 400)

  // Derive the collection from the key's prefix rather than trusting the client.
  const collection = body.key.split('/')[0]
  if (!COLLECTION_RE.test(collection))
    return json({ error: 'invalid key' }, 400)

  if (body.uploadId) {
    if (!Array.isArray(body.parts) || body.parts.length === 0)
      return json({ error: 'parts required' }, 400)
    await completeMultipartUpload(body.key, body.uploadId, body.parts)
  }

  // Authoritative size/type from storage — never trust the client's claims.
  const { size, contentType } = await headObject(body.key)
  if (size > (body.maxSize ?? DEFAULT_MAX_UPLOAD_SIZE)) {
    await deleteObject(body.key)
    return json({ error: 'File too large' }, 413)
  }

  return json(
    await record({
      key: body.key,
      name: body.filename ?? 'file',
      mimeType: contentType,
      size,
      collection,
      modelType: body.modelType ?? null,
      modelId: body.modelId ?? null,
      // No auth here. An authorized procedure can pass its own user id.
      userId: null,
    }),
  )
}

// Multipart: discard an in-progress upload.
async function abort(url: URL) {
  const key = url.searchParams.get('key')
  const uploadId = url.searchParams.get('uploadId')
  if (!key || !uploadId) return json({ error: 'key/uploadId required' }, 400)
  await abortMultipartUpload(key, uploadId)
  return new Response(null, { status: 204 })
}

// Delete a finished file: storage first, then DB row.
async function remove(url: URL) {
  const key = url.searchParams.get('key')
  if (!key) return json({ error: 'key required' }, 400)
  await deleteObject(key)
  await db.delete(media).where(eq(media.key, key))
  return new Response(null, { status: 204 })
}

// Parse the URL, run the action, and turn unexpected failures into a 500.
async function handle(
  request: Request,
  run: (url: URL) => Response | Promise<Response>,
) {
  try {
    return await run(new URL(request.url))
  } catch (err) {
    console.error('[upload]', err)
    return json({ error: 'Upload request failed' }, 500)
  }
}

export const Route = createFileRoute('/api/upload/$')({
  server: {
    handlers: {
      POST: ({ request }) =>
        handle(request, (url) => {
          if (action(url) === 'sign') return sign(request)
          if (action(url) === 'sign-parts') return signPartUrls(request)
          if (action(url) === 'complete') return complete(request)
          return json({ error: 'unknown action' }, 404)
        }),
      DELETE: ({ request }) =>
        handle(request, (url) => {
          if (action(url) === 'abort') return abort(url)
          if (action(url) === 'delete') return remove(url)
          return json({ error: 'unknown action' }, 404)
        }),
    },
  },
})
