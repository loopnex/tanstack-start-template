import { media } from '#/db/schema'
import { db } from '#/lib/db'
import { deleteObject, objectPublicUrl } from '#/lib/media/s3'
import type { MediaSchemaType } from '#/schema/mediaSchema'
import { and, eq, inArray } from 'drizzle-orm'

export type Media = typeof media.$inferSelect

export const mediaService = {
  // DB row → mediaSchema shape (the single source of truth for media output).
  toResult(m: Media): MediaSchemaType {
    return {
      mediaId: m.id,
      key: m.key,
      url: objectPublicUrl(m.key),
      name: m.name,
      mimeType: m.mimeType,
      size: m.size,
    }
  },

  // Single media row for a model + collection (e.g. article thumbnail)
  async findOne(
    model: string,
    modelId: string,
    collection: string,
  ): Promise<Media | null> {
    const [row] = await db
      .select()
      .from(media)
      .where(
        and(
          eq(media.modelType, model),
          eq(media.modelId, modelId),
          eq(media.collection, collection),
        ),
      )
    return row ?? null
  },

  // Batch-fetch one row per id (list pages, no N+1) → Map<modelId, Media>.
  async findForIds(
    model: string,
    ids: string[],
    collection: string,
  ): Promise<Map<string, Media>> {
    if (!ids.length) return new Map()
    const rows = await db
      .select()
      .from(media)
      .where(
        and(
          eq(media.modelType, model),
          inArray(media.modelId, ids),
          eq(media.collection, collection),
        ),
      )
    return new Map(rows.map((r) => [r.modelId as string, r]))
  },

  // Attach an uploaded row to a model's slot, replacing (S3 + DB delete) any
  // existing one, and return it. mediaId=undefined just clears the slot.
  async sync(
    model: string,
    modelId: string,
    collection: string,
    mediaId: string | undefined,
  ): Promise<Media | null> {
    const current = await mediaService.findOne(model, modelId, collection)
    if (current?.id === mediaId) return current // nothing changed
    if (current) {
      await deleteObject(current.key)
      await db.delete(media).where(eq(media.id, current.id))
    }
    if (!mediaId) return null
    const [row] = await db
      .update(media)
      .set({ modelType: model, modelId, collection })
      .where(eq(media.id, mediaId))
      .returning()
    return row ?? null
  },

  // Delete all media for a model (optionally one collection). Call before
  // deleting the parent to avoid orphaned S3 objects.
  async deleteAll(
    model: string,
    modelId: string,
    collection?: string,
  ): Promise<void> {
    const conditions = [eq(media.modelType, model), eq(media.modelId, modelId)]
    if (collection) conditions.push(eq(media.collection, collection))
    const rows = await db
      .select()
      .from(media)
      .where(and(...conditions))
    if (!rows.length) return
    await Promise.allSettled(rows.map((r) => deleteObject(r.key)))
    await db.delete(media).where(
      inArray(
        media.id,
        rows.map((r) => r.id),
      ),
    )
  },
}
