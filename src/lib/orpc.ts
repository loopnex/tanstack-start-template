import { router } from '#/orpc/router'
import { createORPCClient, toORPCError } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import { createRouterClient, onError } from '@orpc/server'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type {
  DefaultError,
  EnsureQueryDataOptions,
  QueryClient,
  QueryKey,
} from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

/**
 * queryClient.ensureQueryData with a NOT_FOUND turned into the 404 page.
 * Use it in every route loader instead of calling ensureQueryData directly.
 */
export async function ensureQueryData<
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryClient: QueryClient,
  options: EnsureQueryDataOptions<TQueryFnData, TError, TData, TQueryKey>,
): Promise<TData> {
  try {
    return await queryClient.ensureQueryData(options)
  } catch (error) {
    if (toORPCError(error).status === 404) throw notFound()
    throw error
  }
}

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
      // Logs errors from loaders
      interceptors: [onError((error) => console.error(error))],
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

// TanStack Query utils generated from the client
export const orpc = createTanstackQueryUtils(client)
