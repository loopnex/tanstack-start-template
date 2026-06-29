import type { PaginationSchemaType } from '#/schema/paginationSchema'

// Pagination query
export function getPaginationQuery(query: PaginationSchemaType) {
  const page = query.page ?? 1
  const limit = query.limit ?? 10
  const skip = (page - 1) * limit
  return { skip, take: limit, page, limit }
}
