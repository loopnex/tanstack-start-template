import { media } from '#/db/schema'
import { db } from '#/lib/db'
import { deleteObject, objectPublicUrl } from '#/lib/media/s3'
import type { MediaSchemaType } from '#/schema/mediaSchema'
import { and, asc, eq, inArray } from 'drizzle-orm'

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
      .limit(1)
    return row ?? null
  },

  // All media rows for a model + collection, oldest first
  async findMany(
    model: string,
    modelId: string,
    collection: string,
  ): Promise<Media[]> {
    return db
      .select()
      .from(media)
      .where(
        and(
          eq(media.modelType, model),
          eq(media.modelId, modelId),
          eq(media.collection, collection),
        ),
      )
      .orderBy(asc(media.createdAt))
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

  /**
   * Multi-file equivalent of sync. Rows missing from mediaIds are deleted,
   * new ids are claimed. mediaIds=undefined leaves the slot untouched.
   */
  async syncMany(
    model: string,
    modelId: string,
    collection: string,
    mediaIds: string[] | undefined,
  ): Promise<Media[]> {
    if (!mediaIds) return mediaService.findMany(model, modelId, collection)

    const current = await mediaService.findMany(model, modelId, collection)
    const keep = new Set(mediaIds)
    const removed = current.filter((row) => !keep.has(row.id))
    if (removed.length) {
      await Promise.allSettled(removed.map((row) => deleteObject(row.key)))
      await db.delete(media).where(
        inArray(
          media.id,
          removed.map((row) => row.id),
        ),
      )
    }

    const owned = new Set(current.map((row) => row.id))
    const toClaim = mediaIds.filter((id) => !owned.has(id))
    if (toClaim.length) {
      await db
        .update(media)
        .set({ modelType: model, modelId, collection })
        .where(inArray(media.id, toClaim))
    }

    return mediaService.findMany(model, modelId, collection)
  },

  // Delete all media for many models at once
  async deleteForIds(model: string, ids: string[]): Promise<void> {
    if (!ids.length) return
    const rows = await db
      .select()
      .from(media)
      .where(and(eq(media.modelType, model), inArray(media.modelId, ids)))
    if (!rows.length) return
    await Promise.allSettled(rows.map((r) => deleteObject(r.key)))
    await db.delete(media).where(
      inArray(
        media.id,
        rows.map((r) => r.id),
      ),
    )
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
