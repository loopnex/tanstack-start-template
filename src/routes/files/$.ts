import { db } from '#/db'
import { media } from '#/db/schema'
import { getObject } from '#/lib/cloudflare/r2'
import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

// Stream the object for /files/{key}; immutable since keys are never reused.
async function serve(request: Request) {
  const url = new URL(request.url)
  const key = decodeURIComponent(url.pathname.replace(/^\/files\//, ''))
  if (!key) return new Response('Not Found', { status: 404 })

  const obj = await getObject(key)
  if (!obj) return new Response('Not Found', { status: 404 })

  // Original filename for the download dialog; falls back to the key tail.
  const [row] = await db.select().from(media).where(eq(media.key, key)).limit(1)
  const filename = (row?.name ?? key.split('/').pop() ?? 'file').replace(
    /"/g,
    '',
  )

  const headers = new Headers()
  obj.writeHttpMetadata(headers) // Content-Type etc. from stored metadata
  headers.set('etag', obj.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('content-disposition', `inline; filename="${filename}"`)
  return new Response(obj.body, { headers })
}

export const Route = createFileRoute('/files/$')({
  server: {
    handlers: {
      GET: ({ request }) => serve(request),
    },
  },
})
