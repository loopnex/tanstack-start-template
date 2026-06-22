import { db } from '#/lib/db'
import { media } from '#/db/schema'
import { getObject } from '#/lib/media/s3'
import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

// Stream the object for /files/{key}; immutable since keys are never reused.
async function serve(request: Request) {
  const url = new URL(request.url)
  const key = decodeURIComponent(url.pathname.replace(/^\/files\//, ''))
  if (!key) return new Response('Not Found', { status: 404 })

  let obj
  try {
    obj = await getObject(key)
  } catch {
    return new Response('Not Found', { status: 404 })
  }
  if (!obj.Body) return new Response('Not Found', { status: 404 })

  // Original filename for the download dialog; falls back to the key tail.
  const [row] = await db.select().from(media).where(eq(media.key, key)).limit(1)
  const filename = (row?.name ?? key.split('/').pop() ?? 'file').replace(
    /"/g,
    '',
  )

  const headers = new Headers()
  headers.set('content-type', obj.ContentType ?? 'application/octet-stream')
  if (obj.ContentLength != null)
    headers.set('content-length', String(obj.ContentLength))
  if (obj.ETag) headers.set('etag', obj.ETag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('content-disposition', `inline; filename="${filename}"`)
  return new Response(obj.Body.transformToWebStream(), { headers })
}

export const Route = createFileRoute('/files/$')({
  server: {
    handlers: {
      GET: ({ request }) => serve(request),
    },
  },
})
