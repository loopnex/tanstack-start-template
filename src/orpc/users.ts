import { articles as articlesTable, users as usersTable } from '#/db/schema'
import { auth } from '#/lib/better-auth/auth'
import { db } from '#/lib/db'
import { mediaService } from '#/lib/media/queries'
import { getPaginationQuery } from '#/lib/pagination'
import { adminOnly } from '#/orpc'
import { paginated } from '#/schema/paginationSchema'
import {
  userBanSchema,
  userFilterSchema,
  userInputSchema,
  userSchema,
  userUpdateSchema,
} from '#/schema/userSchema'
import { ORPCError } from '@orpc/server'
import { and, asc, desc, eq, ilike, isNotNull, not, or } from 'drizzle-orm'
import * as z from 'zod'

// Get Users (Paginated)
const getUsers = adminOnly
  .route({
    method: 'GET',
    path: '/users',
    summary: 'List users',
    tags: ['Users'],
  })
  .input(userFilterSchema)
  .output(paginated(userSchema))
  .handler(async ({ input }) => {
    const { skip, take, page, limit } = getPaginationQuery(input)
    const where = and(
      input.search
        ? or(
            ilike(usersTable.name, `%${input.search}%`),
            ilike(usersTable.email, `%${input.search}%`),
          )
        : undefined,
      input.role ? eq(usersTable.role, input.role) : undefined,
    )

    const [rows, total] = await Promise.all([
      db
        .select()
        .from(usersTable)
        .where(where)
        .orderBy(desc(usersTable.createdAt))
        .limit(take)
        .offset(skip),
      db.$count(usersTable, where),
    ])

    return { data: rows, meta: { page, limit, total } }
  })

// Get User Roles (distinct roles currently in use)
const getUserRoles = adminOnly
  .route({
    method: 'GET',
    path: '/users/roles',
    summary: 'List roles in use',
    tags: ['Users'],
  })
  .output(z.array(z.string()))
  .handler(async () => {
    const rows = await db
      .selectDistinct({ role: usersTable.role })
      .from(usersTable)
      .where(isNotNull(usersTable.role))
      .orderBy(asc(usersTable.role))
    return rows.flatMap((r) => (r.role ? [r.role] : []))
  })

// Get User
const getUser = adminOnly
  .route({
    method: 'GET',
    path: '/users/{id}',
    summary: 'Get a user',
    tags: ['Users'],
  })
  .input(z.object({ id: z.string() }))
  .output(userSchema)
  .handler(async ({ input }) => {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .limit(1)
    if (!user) throw new ORPCError('NOT_FOUND', { message: 'User not found' })
    return user
  })

// Create User
const createUser = adminOnly
  .route({
    method: 'POST',
    path: '/users',
    summary: 'Create a user',
    tags: ['Users'],
  })
  .input(userInputSchema)
  .output(userSchema)
  .handler(async ({ input, context }) => {
    const [taken] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .limit(1)

    if (taken)
      throw new ORPCError('CONFLICT', { message: 'Email already taken' })

    const { user } = await auth.api.createUser({
      headers: context.headers,
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
      },
    })

    const [created] = await db
      .update(usersTable)
      .set({ role: input.role })
      .where(eq(usersTable.id, user.id))
      .returning()

    if (!created)
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to create user',
      })

    return created
  })

// Update User (name, email, role)
const updateUser = adminOnly
  .route({
    method: 'PUT',
    path: '/users/{id}',
    summary: 'Update a user',
    tags: ['Users'],
  })
  .input(z.object({ id: z.string(), ...userUpdateSchema.shape }))
  .output(userSchema)
  .handler(async ({ input, context }) => {
    const { id, name, email, role } = input

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1)
    if (!existing)
      throw new ORPCError('NOT_FOUND', { message: 'User not found' })

    if (id === context.user.id && role !== existing.role)
      throw new ORPCError('CONFLICT', {
        message: 'You cannot change your own role',
      })

    const [taken] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.email, email), not(eq(usersTable.id, id))))
      .limit(1)
    if (taken)
      throw new ORPCError('CONFLICT', { message: 'Email already taken' })

    await auth.api.adminUpdateUser({
      headers: context.headers,
      body: { userId: id, data: { name, email } },
    })

    const [updated] = await db
      .update(usersTable)
      .set({ role })
      .where(eq(usersTable.id, id))
      .returning()

    // Empty when the row was deleted after the existence check above
    if (!updated)
      throw new ORPCError('NOT_FOUND', { message: 'User not found' })

    return updated
  })

// Ban / Unban User
const banUser = adminOnly
  .route({
    method: 'PUT',
    path: '/users/{id}/ban',
    summary: 'Ban or unban a user',
    tags: ['Users'],
  })
  .input(z.object({ id: z.string(), ...userBanSchema.shape }))
  .output(userSchema)
  .handler(async ({ input, context }) => {
    const { id, banned, banReason } = input

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1)

    if (!existing)
      throw new ORPCError('NOT_FOUND', { message: 'User not found' })

    if (id === context.user.id)
      throw new ORPCError('CONFLICT', { message: 'You cannot ban yourself' })

    if (banned) {
      await auth.api.banUser({
        headers: context.headers,
        body: { userId: id, banReason: banReason || undefined },
      })
    } else {
      await auth.api.unbanUser({
        headers: context.headers,
        body: { userId: id },
      })
    }

    const [updated] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1)

    // Empty when the row was deleted after the existence check above
    if (!updated)
      throw new ORPCError('NOT_FOUND', { message: 'User not found' })

    return updated
  })

// Delete User
const deleteUser = adminOnly
  .route({
    method: 'DELETE',
    path: '/users/{id}',
    summary: 'Delete a user',
    tags: ['Users'],
  })
  .input(z.object({ id: z.string() }))
  .output(userSchema)
  .handler(async ({ input, context }) => {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .limit(1)
    if (!user) throw new ORPCError('NOT_FOUND', { message: 'User not found' })

    if (user.id === context.user.id)
      throw new ORPCError('CONFLICT', {
        message: 'You cannot delete your own account',
      })

    // Clear media before the article rows cascade away
    const authored = await db
      .select({ id: articlesTable.id })
      .from(articlesTable)
      .where(eq(articlesTable.userId, user.id))
    await mediaService.deleteForIds(
      'article',
      authored.map((a) => a.id),
    )

    await auth.api.removeUser({
      headers: context.headers,
      body: { userId: input.id },
    })
    return user
  })

export const users = {
  getUsers,
  getUserRoles,
  getUser,
  createUser,
  updateUser,
  banUser,
  deleteUser,
}
