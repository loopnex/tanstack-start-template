import { articleCategories, articles as articlesTable } from '#/db/schema'
import { db } from '#/lib/db'
import { mediaService } from '#/lib/media/queries'
import { getPaginationQuery } from '#/lib/pagination'
import { authorized } from '#/orpc'
import {
  articleDetailSchema,
  articleFilterSchema,
  articleInputSchema,
  articleSchema,
} from '#/schema/articleSchema'
import { paginated } from '#/schema/paginationSchema'
import { ORPCError } from '@orpc/server'
import slugify from '@sindresorhus/slugify'
import { and, desc, eq, ilike, not, or } from 'drizzle-orm'
import * as z from 'zod'

const MODEL = 'article'
const COLLECTION = 'thumbnail'

// Get Articles (Paginated)
const getArticles = authorized
  .route({
    method: 'GET',
    path: '/articles',
    summary: 'List articles',
    tags: ['Articles'],
  })
  .input(articleFilterSchema)
  .output(paginated(articleSchema))
  .handler(async ({ input }) => {
    const { skip, take, page, limit } = getPaginationQuery(input)
    const where = and(
      input.search
        ? or(
            ilike(articlesTable.title, `%${input.search}%`),
            ilike(articlesTable.slug, `%${input.search}%`),
            ilike(articlesTable.excerpt, `%${input.search}%`),
          )
        : undefined,
      input.status ? eq(articlesTable.status, input.status) : undefined,
    )

    const [rows, total] = await Promise.all([
      db
        .select()
        .from(articlesTable)
        .where(where)
        .orderBy(desc(articlesTable.createdAt))
        .limit(take)
        .offset(skip),
      db.$count(articlesTable, where),
    ])

    const thumbMap = await mediaService.findForIds(
      MODEL,
      rows.map((r) => r.id),
      COLLECTION,
    )

    const data = rows.map((r) => ({
      ...r,
      thumbnail: thumbMap.has(r.id)
        ? mediaService.toResult(thumbMap.get(r.id)!)
        : null,
    }))

    return { data, meta: { page, limit, total } }
  })

// Get Article
const getArticle = authorized
  .route({
    method: 'GET',
    path: '/articles/{id}',
    summary: 'Get an article',
    tags: ['Articles'],
  })
  .input(z.object({ id: z.string() }))
  .output(articleDetailSchema)
  .handler(async ({ input }) => {
    const article = await db.query.articles.findFirst({
      where: eq(articlesTable.id, input.id),
      with: { categories: { columns: { categoryId: true } } },
    })

    if (!article)
      throw new ORPCError('NOT_FOUND', { message: 'Article not found' })

    const thumb = await mediaService.findOne(MODEL, article.id, COLLECTION)

    return {
      ...article,
      categoryIds: article.categories.map((c) => c.categoryId),
      thumbnail: thumb ? mediaService.toResult(thumb) : null,
    }
  })

// Create Article
const createArticle = authorized
  .route({
    method: 'POST',
    path: '/articles',
    summary: 'Create an article',
    tags: ['Articles'],
  })
  .input(articleInputSchema)
  .output(articleSchema)
  .handler(async ({ input, context }) => {
    const slug = slugify(input.slug || input.title)

    const [taken] = await db
      .select({ id: articlesTable.id })
      .from(articlesTable)
      .where(eq(articlesTable.title, input.title))
      .limit(1)

    if (taken)
      throw new ORPCError('CONFLICT', { message: 'Title already taken' })

    const article = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(articlesTable)
        .values({
          userId: context.user.id,
          title: input.title,
          slug,
          excerpt: input.excerpt,
          body: input.body,
          status: input.status,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          publishedAt: input.status === 'published' ? new Date() : null,
        })
        .returning()

      if (input.categoryIds.length) {
        await tx.insert(articleCategories).values(
          input.categoryIds.map((categoryId) => ({
            articleId: row.id,
            categoryId,
          })),
        )
      }
      return row
    })

    const thumb = await mediaService.sync(
      MODEL,
      article.id,
      COLLECTION,
      input.thumbnailMediaId,
    )

    return {
      ...article,
      thumbnail: thumb ? mediaService.toResult(thumb) : null,
    }
  })

// Update Article
const updateArticle = authorized
  .route({
    method: 'PUT',
    path: '/articles/{id}',
    summary: 'Update an article',
    tags: ['Articles'],
  })
  .input(z.object({ id: z.string(), ...articleInputSchema.shape }))
  .output(articleSchema)
  .handler(async ({ input }) => {
    const { id, categoryIds, thumbnailMediaId, ...data } = input
    const slug = slugify(data.slug || data.title)

    const [existing] = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, id))

    if (!existing)
      throw new ORPCError('NOT_FOUND', { message: 'Article not found' })

    const [taken] = await db
      .select({ id: articlesTable.id })
      .from(articlesTable)
      .where(
        and(eq(articlesTable.title, data.title), not(eq(articlesTable.id, id))),
      )
      .limit(1)

    if (taken)
      throw new ORPCError('CONFLICT', { message: 'Title already taken' })

    const article = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(articlesTable)
        .set({
          title: data.title,
          slug,
          excerpt: data.excerpt,
          body: data.body,
          status: data.status,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          publishedAt:
            data.status === 'published' && !existing.publishedAt
              ? new Date()
              : existing.publishedAt,
        })
        .where(eq(articlesTable.id, id))
        .returning()

      await tx
        .delete(articleCategories)
        .where(eq(articleCategories.articleId, id))

      if (categoryIds.length) {
        await tx
          .insert(articleCategories)
          .values(
            categoryIds.map((categoryId) => ({ articleId: id, categoryId })),
          )
      }
      return row
    })

    const thumb = await mediaService.sync(
      MODEL,
      id,
      COLLECTION,
      thumbnailMediaId,
    )
    return {
      ...article,
      thumbnail: thumb ? mediaService.toResult(thumb) : null,
    }
  })

// Delete Article
const deleteArticle = authorized
  .route({
    method: 'DELETE',
    path: '/articles/{id}',
    summary: 'Delete an article',
    tags: ['Articles'],
  })
  .input(z.object({ id: z.string() }))
  .output(articleSchema)
  .handler(async ({ input }) => {
    const [article] = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, input.id))
    if (!article)
      throw new ORPCError('NOT_FOUND', { message: 'Article not found' })

    await mediaService.deleteAll(MODEL, article.id)
    await db.delete(articlesTable).where(eq(articlesTable.id, input.id))
    return { ...article, thumbnail: null }
  })

export const articles = {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
}
