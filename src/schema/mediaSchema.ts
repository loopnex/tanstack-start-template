import * as z from 'zod'

// Media schema
export const mediaSchema = z.object({
  mediaId: z.string(),
  key: z.string(),
  url: z.string(),
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
})
export type MediaSchemaType = z.infer<typeof mediaSchema>
