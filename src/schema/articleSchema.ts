import { mediaSchema } from '#/schema/mediaSchema'
import { paginationSchema } from '#/schema/paginationSchema'
import * as z from 'zod'

export const ARTICLE_STATUS = ['draft', 'published'] as const

// Article with resolved thumbnail
export const articleSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullish(),
  body: z.string(),
  status: z.enum(ARTICLE_STATUS),
  metaTitle: z.string().nullish(),
  metaDescription: z.string().nullish(),
  publishedAt: z.coerce.date().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  thumbnail: mediaSchema.nullable(),
})
export type ArticleSchemaType = z.infer<typeof articleSchema>

// Article detail with category ids
export const articleDetailSchema = articleSchema.extend({
  categoryIds: z.array(z.string()),
})
export type ArticleDetailSchemaType = z.infer<typeof articleDetailSchema>

// Article input with transient thumbnail media id
export const articleInputSchema = z.object({
  title: z.string().nonempty('Title is required'),
  slug: z.string().nonempty('Slug is required'),
  excerpt: z.string().optional(),
  body: z.string().nonempty('Body is required'),
  status: z.enum(ARTICLE_STATUS),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  thumbnailMediaId: z.string().optional(),
  categoryIds: z.array(z.string()),
})
export type ArticleInputSchemaType = z.infer<typeof articleInputSchema>

// Article list filters
export const articleFilterSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(ARTICLE_STATUS).optional(),
  ...paginationSchema.shape,
})
export type ArticleFilterSchemaType = z.infer<typeof articleFilterSchema>
