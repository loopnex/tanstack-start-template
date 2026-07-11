import type { PaginationSchemaType } from '#/schema/paginationSchema'

// Pagination query
export function getPaginationQuery(query: PaginationSchemaType) {
  const page = query.page ?? 1
  const limit = query.limit ?? 10
  const skip = (page - 1) * limit
  return { skip, take: limit, page, limit }
}

// <Pagination>'s onPageChange/onLimitChange, wired to a route's navigate
export function paginationHandlers<TSearch extends PaginationSchemaType>(
  navigate: (opts: { search: (prev: TSearch) => TSearch }) => void,
) {
  return {
    onPageChange: (page: number) =>
      navigate({ search: (prev) => ({ ...prev, page }) }),
    onLimitChange: (limit: number) =>
      navigate({ search: (prev) => ({ ...prev, limit, page: undefined }) }),
  }
}
