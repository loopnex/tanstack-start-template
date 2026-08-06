import { categories as categoriesTable } from '#/db/schema'
import { db } from '#/lib/db'
import { mediaService } from '#/lib/media/queries'
import { getPaginationQuery } from '#/lib/pagination'
import { authorized } from '#/orpc'
import {
  categoryFilterSchema,
  categoryInputSchema,
  categoryOptionSchema,
  categorySchema,
} from '#/schema/categorySchema'
import { paginated } from '#/schema/paginationSchema'
import { ORPCError } from '@orpc/server'
import slugify from '@sindresorhus/slugify'
import { and, asc, eq, ilike, not, or } from 'drizzle-orm'
import * as z from 'zod'

const MODEL = 'category'
const COLLECTION = 'image'

/**
 * Rejects a parent that is the category itself or one of its descendants,
 * by walking the ancestor chain to the root.
 */
async function assertNoCycle(id: string, parentId: string) {
  if (parentId === id)
    throw new ORPCError('CONFLICT', {
      message: 'A category cannot be its own parent',
    })

  const seen = new Set([id])
  let current: string | null = parentId
  while (current) {
    if (seen.has(current))
      throw new ORPCError('CONFLICT', {
        message: 'That parent would create a category loop',
      })
    seen.add(current)
    const [row] = await db
      .select({ parentId: categoriesTable.parentId })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, current))
      .limit(1)
    current = row?.parentId ?? null
  }
}

// Get Categories (Paginated)
const getCategories = authorized
  .route({
    method: 'GET',
    path: '/categories',
    summary: 'List categories',
    tags: ['Categories'],
  })
  .input(categoryFilterSchema)
  .output(paginated(categorySchema))
  .handler(async ({ input }) => {
    const { skip, take, page, limit } = getPaginationQuery(input)
    const where = input.search
      ? or(
          ilike(categoriesTable.name, `%${input.search}%`),
          ilike(categoriesTable.slug, `%${input.search}%`),
        )
      : undefined

    const [rows, total] = await Promise.all([
      db
        .select()
        .from(categoriesTable)
        .where(where)
        .orderBy(asc(categoriesTable.name))
        .limit(take)
        .offset(skip),
      db.$count(categoriesTable, where),
    ])
    const images = await mediaService.findForIds(
      MODEL,
      rows.map((r) => r.id),
      COLLECTION,
    )
    const data = rows.map((r) => ({
      ...r,
      image: images.get(r.id) ?? null,
    }))
    return { data, meta: { page, limit, total } }
  })

// Get Category Options (full list for selects)
const getCategoryOptions = authorized
  .route({
    method: 'GET',
    path: '/categories/options',
    summary: 'List all categories as id/name options',
    tags: ['Categories'],
  })
  .output(z.array(categoryOptionSchema))
  .handler(async () => {
    return db
      .select({ id: categoriesTable.id, name: categoriesTable.name })
      .from(categoriesTable)
      .orderBy(asc(categoriesTable.name))
  })

// Get Category
const getCategory = authorized
  .route({
    method: 'GET',
    path: '/categories/{id}',
    summary: 'Get a category',
    tags: ['Categories'],
  })
  .input(z.object({ id: z.string() }))
  .output(categorySchema)
  .handler(async ({ input }) => {
    const [category] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.id))
      .limit(1)

    if (!category)
      throw new ORPCError('NOT_FOUND', { message: 'Category not found' })

    return {
      ...category,
      image: await mediaService.findOne(MODEL, category.id, COLLECTION),
    }
  })

// Create Category
const createCategory = authorized
  .route({
    method: 'POST',
    path: '/categories',
    summary: 'Create a category',
    tags: ['Categories'],
  })
  .input(categoryInputSchema)
  .output(categorySchema)
  .handler(async ({ input }) => {
    const slug = slugify(input.slug || input.name)

    const [taken] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.name, input.name))
      .limit(1)

    if (taken)
      throw new ORPCError('CONFLICT', { message: 'Name already taken' })

    const [category] = await db
      .insert(categoriesTable)
      .values({
        name: input.name,
        slug,
        description: input.description,
        parentId: input.parentId || null,
      })
      .returning()

    if (!category)
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to create category',
      })

    return {
      ...category,
      image: await mediaService.sync(
        MODEL,
        category.id,
        COLLECTION,
        input.imageMediaId,
      ),
    }
  })

// Update Category
const updateCategory = authorized
  .route({
    method: 'PUT',
    path: '/categories/{id}',
    summary: 'Update a category',
    tags: ['Categories'],
  })
  .input(z.object({ id: z.string(), ...categoryInputSchema.shape }))
  .output(categorySchema)
  .handler(async ({ input }) => {
    const { id, imageMediaId, ...data } = input
    const slug = slugify(data.slug || data.name)
    const parentId = data.parentId || null

    const [existing] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .limit(1)

    if (!existing)
      throw new ORPCError('NOT_FOUND', { message: 'Category not found' })

    const [taken] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.name, data.name),
          not(eq(categoriesTable.id, id)),
        ),
      )
      .limit(1)

    if (taken)
      throw new ORPCError('CONFLICT', { message: 'Name already taken' })

    if (parentId) await assertNoCycle(id, parentId)

    const [category] = await db
      .update(categoriesTable)
      .set({ name: data.name, slug, description: data.description, parentId })
      .where(eq(categoriesTable.id, id))
      .returning()

    // Empty when the row was deleted after the existence check above
    if (!category)
      throw new ORPCError('NOT_FOUND', { message: 'Category not found' })

    return {
      ...category,
      image: await mediaService.sync(MODEL, id, COLLECTION, imageMediaId),
    }
  })

// Delete Category
const deleteCategory = authorized
  .route({
    method: 'DELETE',
    path: '/categories/{id}',
    summary: 'Delete a category',
    tags: ['Categories'],
  })
  .input(z.object({ id: z.string() }))
  .output(categorySchema)
  .handler(async ({ input }) => {
    const [category] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.id))
      .limit(1)

    if (!category)
      throw new ORPCError('NOT_FOUND', { message: 'Category not found' })

    await mediaService.deleteAll(MODEL, category.id)
    await db.delete(categoriesTable).where(eq(categoriesTable.id, input.id))
    return { ...category, image: null }
  })

export const categories = {
  getCategories,
  getCategory,
  getCategoryOptions,
  createCategory,
  updateCategory,
  deleteCategory,
}
