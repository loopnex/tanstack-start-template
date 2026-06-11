import { db } from '#/db'
import { media } from '#/db/schema'
import { auth } from '#/lib/better-auth/auth'
import {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartUpload,
  deleteObject,
  putObject,
  uploadPart,
  type UploadedPart,
} from '#/lib/cloudflare/r2'
import slugify from '@sindresorhus/slugify'
import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import path from 'node:path'
import { ulid } from 'ulid'

const COLLECTION_RE = /^[a-z0-9-]+$/
const json = (data: unknown, status = 200) => Response.json(data, { status })

// The action is the last path segment, e.g. /api/upload/create.
const action = (url: URL) => url.pathname.split('/').filter(Boolean).pop() ?? ''

// {collection}/{slug}-{ulid}.{ext} — client input is never used raw as a path.
function buildKey(filename: string, collection: string) {
  const ext = path.extname(filename).slice(1).toLowerCase()
  const name = path.basename(filename, path.extname(filename))
  const base = `${collection}/${slugify(name, { decamelize: false }) || 'file'}-${ulid()}`
  return ext ? `${base}.${ext}` : base
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
  userId: string
  origin: string
}) {
  const mediaId = ulid()
  const url = `${args.origin}/files/${args.key}`
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

// Small files: stream the whole body to R2 in one request, then record it.
async function uploadSingle(request: Request, url: URL, userId: string) {
  if (!request.body) return json({ error: 'empty body' }, 400)
  const filename = url.searchParams.get('filename') ?? 'file'
  const collection = url.searchParams.get('collection') || 'default'
  if (!COLLECTION_RE.test(collection))
    return json({ error: 'invalid collection' }, 400)

  const mimeType =
    request.headers.get('content-type') || 'application/octet-stream'
  const key = buildKey(filename, collection)
  const { size } = await putObject(key, request.body, mimeType)
  return json(
    await record({
      key,
      name: filename,
      mimeType,
      size,
      collection,
      modelType: url.searchParams.get('modelType'),
      modelId: url.searchParams.get('modelId'),
      userId,
      origin: url.origin,
    }),
  )
}

// Multipart: begin an upload and return the key + uploadId.
async function mpuCreate(request: Request) {
  const body = (await request.json()) as {
    filename?: string
    collection?: string
    contentType?: string
  }
  const collection = body.collection || 'default'
  if (!body.filename) return json({ error: 'filename required' }, 400)
  if (!COLLECTION_RE.test(collection))
    return json({ error: 'invalid collection' }, 400)

  const key = buildKey(body.filename, collection)
  return json(
    await createMultipartUpload(
      key,
      body.contentType || 'application/octet-stream',
    ),
  )
}

// Multipart: upload one raw part.
async function mpuPart(request: Request, url: URL) {
  const key = url.searchParams.get('key')
  const uploadId = url.searchParams.get('uploadId')
  const partNumber = Number(url.searchParams.get('partNumber'))
  if (!key || !uploadId) return json({ error: 'key/uploadId required' }, 400)
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10_000)
    return json({ error: 'invalid partNumber' }, 400)
  if (!request.body) return json({ error: 'empty body' }, 400)
  return json(
    await uploadPart(key, uploadId, partNumber, await request.arrayBuffer()),
  )
}

// Multipart: assemble the parts, then record the row.
async function mpuComplete(request: Request, url: URL, userId: string) {
  const body = (await request.json()) as {
    key?: string
    uploadId?: string
    parts?: UploadedPart[]
    filename?: string
    collection?: string
    modelType?: string
    modelId?: string
    mimeType?: string
    size?: number
  }
  if (!body.key || !body.uploadId)
    return json({ error: 'key/uploadId required' }, 400)
  if (!Array.isArray(body.parts) || body.parts.length === 0)
    return json({ error: 'parts required' }, 400)
  if (typeof body.size !== 'number' || body.size < 0)
    return json({ error: 'invalid size' }, 400)

  await completeMultipartUpload(body.key, body.uploadId, body.parts)
  return json(
    await record({
      key: body.key,
      name: body.filename ?? 'file',
      mimeType: body.mimeType || 'application/octet-stream',
      size: body.size,
      collection: body.collection || 'default',
      modelType: body.modelType ?? null,
      modelId: body.modelId ?? null,
      userId,
      origin: url.origin,
    }),
  )
}

// Multipart: discard an in-progress upload.
async function mpuAbort(url: URL) {
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

// Auth-gate every request, then hand the handler the user + parsed URL.
async function authed(
  request: Request,
  run: (userId: string, url: URL) => Response | Promise<Response>,
) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return json({ error: 'Unauthorized' }, 401)
  return run(session.user.id, new URL(request.url))
}

export const Route = createFileRoute('/api/upload/$')({
  server: {
    handlers: {
      PUT: ({ request }) =>
        authed(request, (userId, url) => {
          if (action(url) === 'single')
            return uploadSingle(request, url, userId)
          if (action(url) === 'part') return mpuPart(request, url)
          return json({ error: 'unknown action' }, 404)
        }),
      POST: ({ request }) =>
        authed(request, (userId, url) => {
          if (action(url) === 'create') return mpuCreate(request)
          if (action(url) === 'complete')
            return mpuComplete(request, url, userId)
          return json({ error: 'unknown action' }, 404)
        }),
      DELETE: ({ request }) =>
        authed(request, (_userId, url) => {
          if (action(url) === 'abort') return mpuAbort(url)
          if (action(url) === 'delete') return remove(url)
          return json({ error: 'unknown action' }, 404)
        }),
    },
  },
})
