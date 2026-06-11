import { db } from '#/db'
import { media } from '#/db/schema'
import { deleteObject } from '#/lib/cloudflare/r2'
import { and, eq, inArray } from 'drizzle-orm'

export type Media = typeof media.$inferSelect

// All media for a model, optionally scoped to a collection.
export async function getMediaForModel(
  modelType: string,
  modelId: string,
  collection?: string,
): Promise<Media[]> {
  const conditions = [
    eq(media.modelType, modelType),
    eq(media.modelId, modelId),
  ]
  if (collection) conditions.push(eq(media.collection, collection))
  return db
    .select()
    .from(media)
    .where(and(...conditions))
}

// First (or only) media item — useful for single-image fields.
export async function getFirstMedia(
  modelType: string,
  modelId: string,
  collection?: string,
): Promise<Media | null> {
  const [row] = await getMediaForModel(modelType, modelId, collection)
  return row ?? null
}

// Delete one file by storage key: storage first, then DB.
export async function deleteMedia(key: string): Promise<void> {
  await deleteObject(key)
  await db.delete(media).where(eq(media.key, key))
}

// Delete all media for a model (optionally one collection). Call before
// deleting the parent record to avoid orphaned objects.
export async function deleteModelMedia(
  modelType: string,
  modelId: string,
  collection?: string,
): Promise<void> {
  const conditions = [
    eq(media.modelType, modelType),
    eq(media.modelId, modelId),
  ]
  if (collection) conditions.push(eq(media.collection, collection))

  const rows = await db
    .select()
    .from(media)
    .where(and(...conditions))
  if (rows.length === 0) return

  // One failed object delete shouldn't block the rest.
  await Promise.allSettled(rows.map((row) => deleteObject(row.key)))
  await db.delete(media).where(
    inArray(
      media.id,
      rows.map((row) => row.id),
    ),
  )
}
