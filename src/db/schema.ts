import { relations } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp
  
} from 'drizzle-orm/pg-core'
import type {AnyPgColumn} from 'drizzle-orm/pg-core';
import { ulid } from 'ulid'

const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}

// Users
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => ulid()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  role: text('role').$type<'user' | 'admin'>(),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  image: text('image'),
  ...timestamps,
})

// Sessions
export const sessions = pgTable(
  'sessions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => ulid()),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    impersonatedBy: text('impersonated_by'),
    ...timestamps,
  },
  (table) => [index('session_userId_idx').on(table.userId)],
)

// Accounts
export const accounts = pgTable(
  'accounts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => ulid()),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (table) => [index('account_userId_idx').on(table.userId)],
)

// Verifications
export const verifications = pgTable(
  'verifications',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => ulid()),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    ...timestamps,
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

// Media — polymorphic file attachments, model_type/model_id
export const media = pgTable(
  'media',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => ulid()),
    modelType: text('model_type'),
    modelId: text('model_id'),
    userId: text('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    key: text('key').notNull().unique(),
    name: text('name').notNull(),
    ext: text('ext').notNull(),
    mimeType: text('mime_type').notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    collection: text('collection').notNull().default('default'),
    url: text('url').notNull(),
    ...timestamps,
  },
  (table) => [
    index('media_model_idx').on(table.modelType, table.modelId),
    index('media_collection_idx').on(
      table.modelType,
      table.modelId,
      table.collection,
    ),
    index('media_userId_idx').on(table.userId),
  ],
)

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  media: many(media),
}))

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const accountRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const mediaRelations = relations(media, ({ one }) => ({
  user: one(users, {
    fields: [media.userId],
    references: [users.id],
  }),
}))

// Categories
export const categories = pgTable(
  'categories',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => ulid()),
    name: text('name').notNull().unique(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    parentId: text('parent_id').references((): AnyPgColumn => categories.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (table) => [index('category_parentId_idx').on(table.parentId)],
)

// Articles
export const articles = pgTable(
  'articles',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => ulid()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().unique(),
    slug: text('slug').notNull().unique(),
    excerpt: text('excerpt'),
    body: text('body').notNull(),
    status: text('status')
      .$type<'draft' | 'published'>()
      .notNull()
      .default('draft'),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    publishedAt: timestamp('published_at'),
    ...timestamps,
  },
  (table) => [
    index('article_userId_idx').on(table.userId),
    index('article_status_idx').on(table.status),
  ],
)

export const articleCategories = pgTable(
  'article_categories',
  {
    articleId: text('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.articleId, table.categoryId] })],
)

export const categoryRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  articles: many(articleCategories),
}))

export const articleRelations = relations(articles, ({ one, many }) => ({
  author: one(users, {
    fields: [articles.userId],
    references: [users.id],
  }),
  categories: many(articleCategories),
}))

export const articleCategoryRelations = relations(
  articleCategories,
  ({ one }) => ({
    article: one(articles, {
      fields: [articleCategories.articleId],
      references: [articles.id],
    }),
    category: one(categories, {
      fields: [articleCategories.categoryId],
      references: [categories.id],
    }),
  }),
)
