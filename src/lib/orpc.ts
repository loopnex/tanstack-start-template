import { router } from '#/orpc/router'
import { createORPCClient, createSafeClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import { createRouterClient } from '@orpc/server'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(router, {
      /**
       * Provide initial context if needed.
       *
       * Because this client instance is shared across all requests,
       * only include context that's safe to reuse globally.
       * For per-request context, use middleware context or pass a function as the initial context.
       */
      context: async () => ({
        headers: getRequestHeaders(), // provide headers if initial context required
      }),
    }),
  )
  .client((): RouterClient<typeof router> => {
    const link = new RPCLink({
      url: `${window.location.origin}/api/rpc`,
    })

    return createORPCClient(link)
  })

// Primary ORPC client
export const client: RouterClient<typeof router> = getORPCClient()

// Safe client — returns [error, data] tuples instead of throwing
export const safeClient = createSafeClient(client)
