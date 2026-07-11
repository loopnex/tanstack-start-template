import * as z from 'zod'

// Pagination Schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(10).max(100).optional(),
})
export type PaginationSchemaType = z.infer<typeof paginationSchema>

// Meta Schema
export const metaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
})
export type MetaSchemaType = z.infer<typeof metaSchema>

// Paginated output wrapper
export function paginated<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    meta: metaSchema,
  })
}
