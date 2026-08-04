import { getObject } from '#/lib/media/s3'
import { createFileRoute } from '@tanstack/react-router'

// Streams stored media for /files/{key}. Only used in production — in dev,
// objectPublicUrl returns a direct S3 URL so this route is never hit.
// Keys are ULID-unique so cache forever.
async function serve(request: Request) {
  const url = new URL(request.url)
  const key = decodeURIComponent(url.pathname.replace(/^\/files\//, ''))
  if (!key) return new Response('Not found', { status: 404 })

  let obj
  try {
    obj = await getObject(key)
  } catch {
    return new Response('Not found', { status: 404 })
  }
  if (!obj.Body) return new Response('Not found', { status: 404 })

  const headers = new Headers()
  headers.set('content-type', obj.ContentType ?? 'application/octet-stream')
  if (obj.ContentLength != null)
    headers.set('content-length', String(obj.ContentLength))
  if (obj.ETag) headers.set('etag', obj.ETag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  return new Response(obj.Body.transformToWebStream(), { headers })
}

export const Route = createFileRoute('/files/$')({
  server: {
    handlers: {
      GET: ({ request }) => serve(request),
    },
  },
})
