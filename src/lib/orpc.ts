import { router } from '#/orpc/router'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import { createRouterClient } from '@orpc/server'
import {
  createGeneralUtils,
  createTanstackQueryUtils,
} from '@orpc/tanstack-query'
import type { QueryClient } from '@tanstack/react-query'
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

// Every create/update/delete under a resource invalidates that resource's whole
// query group on success (e.g. `categories.*` covers getCategoryOptions too, since
// oRPC's generated keys are path-prefixed) — components never call invalidateQueries.
const invalidateOnSuccess = (resource: 'articles' | 'categories') => ({
  mutationOptions: {
    onSuccess: (
      _data: unknown,
      _variables: unknown,
      _onMutateResult: unknown,
      context: { client: QueryClient },
    ): void => {
      context.client.invalidateQueries({
        queryKey: createGeneralUtils([resource]).key(),
      })
    },
  },
})

// TanStack Query utils generated from the client — `.queryOptions`/`.mutationOptions`/
// `.key` replace hand-written queryOptions() wrappers and hand-typed query keys.
export const orpc = createTanstackQueryUtils(client, {
  experimental_defaults: {
    articles: {
      createArticle: invalidateOnSuccess('articles'),
      updateArticle: invalidateOnSuccess('articles'),
      deleteArticle: invalidateOnSuccess('articles'),
    },
    categories: {
      createCategory: invalidateOnSuccess('categories'),
      updateCategory: invalidateOnSuccess('categories'),
      deleteCategory: invalidateOnSuccess('categories'),
    },
  },
})
