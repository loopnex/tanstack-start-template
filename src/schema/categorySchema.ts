import { mediaSchema } from '#/schema/mediaSchema'
import { paginationSchema } from '#/schema/paginationSchema'
import * as z from 'zod'

// Category with resolved image
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullish(),
  parentId: z.string().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  image: mediaSchema.nullable(),
})
export type CategorySchemaType = z.infer<typeof categorySchema>

// Category input with transient image media id
export const categoryInputSchema = z.object({
  name: z.string().nonempty('Name is required'),
  slug: z.string().nonempty('Slug is required'),
  description: z.string().optional(),
  parentId: z.string().nullish(),
  imageMediaId: z.string().optional(),
})
export type CategoryInputSchemaType = z.infer<typeof categoryInputSchema>

// Slim id/name pair for selects (unpaginated, no image)
export const categoryOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
})
export type CategoryOptionSchemaType = z.infer<typeof categoryOptionSchema>

// Category list filters
export const categoryFilterSchema = z.object({
  search: z.string().trim().optional(),
  ...paginationSchema.shape,
})
export type CategoryFilterSchemaType = z.infer<typeof categoryFilterSchema>
