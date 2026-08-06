import { media } from '#/db/schema'
import { db } from '#/lib/db'
import { deleteObject, objectPublicUrl } from '#/lib/media/s3'
import type { MediaSchemaType } from '#/schema/mediaSchema'
import type { SQL } from 'drizzle-orm'
import { and, asc, eq, inArray } from 'drizzle-orm'

// The columns mediaSchema exposes, with the url derived from the key
const resolved = {
  mediaId: media.id,
  key: media.key,
  name: media.name,
  mimeType: media.mimeType,
  size: media.size,
}

const withUrl = (row: Omit<MediaSchemaType, 'url'>): MediaSchemaType => ({
  ...row,
  url: objectPublicUrl(row.key),
})

// Read the slot's rows in the public shape, oldest first
function selectResolved(where: SQL | undefined) {
  return db
    .select(resolved)
    .from(media)
    .where(where)
    .orderBy(asc(media.createdAt))
}

const slot = (model: string, modelId: string, collection: string) =>
  and(
    eq(media.modelType, model),
    eq(media.modelId, modelId),
    eq(media.collection, collection),
  )

// Delete the given rows from storage, then from the table
async function purge(rows: Array<{ mediaId: string; key: string }>) {
  if (!rows.length) return
  await Promise.allSettled(rows.map((row) => deleteObject(row.key)))
  await db.delete(media).where(
    inArray(
      media.id,
      rows.map((row) => row.mediaId),
    ),
  )
}

export const mediaService = {
  // Single media row for a model + collection (e.g. article thumbnail)
  async findOne(
    model: string,
    modelId: string,
    collection: string,
  ): Promise<MediaSchemaType | null> {
    const [row] = await selectResolved(slot(model, modelId, collection)).limit(
      1,
    )
    return row ? withUrl(row) : null
  },

  // All media rows for a model + collection, oldest first
  async findMany(
    model: string,
    modelId: string,
    collection: string,
  ): Promise<MediaSchemaType[]> {
    const rows = await selectResolved(slot(model, modelId, collection))
    return rows.map(withUrl)
  },

  // Batch-fetch one row per id (list pages, no N+1) → Map<modelId, media>
  async findForIds(
    model: string,
    ids: string[],
    collection: string,
  ): Promise<Map<string, MediaSchemaType>> {
    if (!ids.length) return new Map()
    const rows = await db
      .select({ ...resolved, modelId: media.modelId })
      .from(media)
      .where(
        and(
          eq(media.modelType, model),
          inArray(media.modelId, ids),
          eq(media.collection, collection),
        ),
      )
    return new Map(
      rows.flatMap(({ modelId, ...row }) =>
        modelId ? [[modelId, withUrl(row)] as const] : [],
      ),
    )
  },

  /**
   * Attach an uploaded row to a model's slot, replacing (S3 + DB delete) any
   * existing one. mediaId=undefined clears the slot.
   */
  async sync(
    model: string,
    modelId: string,
    collection: string,
    mediaId: string | undefined,
  ): Promise<MediaSchemaType | null> {
    const current = await mediaService.findOne(model, modelId, collection)
    if (current?.mediaId === mediaId) return current
    if (current) await purge([current])
    if (!mediaId) return null

    const [row] = await db
      .update(media)
      .set({ modelType: model, modelId, collection })
      .where(eq(media.id, mediaId))
      .returning(resolved)
    return row ? withUrl(row) : null
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
  ): Promise<MediaSchemaType[]> {
    if (!mediaIds) return mediaService.findMany(model, modelId, collection)

    const current = await mediaService.findMany(model, modelId, collection)
    const keep = new Set(mediaIds)
    await purge(current.filter((row) => !keep.has(row.mediaId)))

    const owned = new Set(current.map((row) => row.mediaId))
    const toClaim = mediaIds.filter((id) => !owned.has(id))
    if (toClaim.length) {
      await db
        .update(media)
        .set({ modelType: model, modelId, collection })
        .where(inArray(media.id, toClaim))
    }

    return mediaService.findMany(model, modelId, collection)
  },

  // Delete every media row for one model, optionally limited to one collection
  async deleteAll(
    model: string,
    modelId: string,
    collection?: string,
  ): Promise<void> {
    const where = and(
      eq(media.modelType, model),
      eq(media.modelId, modelId),
      collection ? eq(media.collection, collection) : undefined,
    )
    await purge(await selectResolved(where))
  },

  // Delete every media row for many models at once
  async deleteForIds(model: string, ids: string[]): Promise<void> {
    if (!ids.length) return
    const where = and(eq(media.modelType, model), inArray(media.modelId, ids))
    await purge(await selectResolved(where))
  },
}
