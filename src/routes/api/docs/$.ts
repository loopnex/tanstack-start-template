import { env } from '#/lib/env'
import { router } from '#/orpc/router'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { onError } from '@orpc/server'
import { CORSPlugin } from '@orpc/server/plugins'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { createFileRoute } from '@tanstack/react-router'

const handler = new OpenAPIHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
  plugins: [
    // Pinned to the app origin; this handler executes real procedures
    new CORSPlugin({
      origin: (origin) => (origin === env.BETTER_AUTH_URL ? origin : null),
      credentials: true,
    }),
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: {
        info: {
          title: 'Tanstack API Reference',
          version: '1.0.0',
        },
        // Relative server so Scalar resolves paths against the current origin
        servers: [{ url: '/api/docs' }],
      },
    }),
  ],
})

export const Route = createFileRoute('/api/docs/$')({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        const { response } = await handler.handle(request, {
          prefix: '/api/docs',
          context: { headers: request.headers },
        })

        return response ?? new Response('Not Found', { status: 404 })
      },
    },
  },
})
