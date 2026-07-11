import { users as usersTable } from '#/db/schema'
import { auth } from '#/lib/better-auth/auth'
import { db } from '#/lib/db'
import { getPaginationQuery } from '#/lib/pagination'
import { adminOnly } from '#/orpc'
import { paginated } from '#/schema/paginationSchema'
import type { UserSchemaType } from '#/schema/userSchema'
import {
  userBanSchema,
  userFilterSchema,
  userInputSchema,
  userSchema,
  userUpdateSchema,
} from '#/schema/userSchema'
import { ORPCError } from '@orpc/server'
import { and, desc, eq, ilike, or } from 'drizzle-orm'
import * as z from 'zod'

// better-auth's admin API returns its own user shape — reshape it to ours
// rather than trust its types (role comes back as a plain `string`).
function toUserResult(user: {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  role?: string | string[] | null
  banned?: boolean | null
  banReason?: string | null
  banExpires?: Date | null
  createdAt: Date
  updatedAt: Date
}): UserSchemaType {
  const role = Array.isArray(user.role) ? user.role[0] : user.role
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image ?? null,
    role: (role as UserSchemaType['role']) ?? null,
    banned: user.banned ?? null,
    banReason: user.banReason ?? null,
    banExpires: user.banExpires ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

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
        role: input.role,
      },
    })

    return toUserResult(user)
  })

// Update User (role only)
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
    const { id, role } = input

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
    if (!existing)
      throw new ORPCError('NOT_FOUND', { message: 'User not found' })

    if (id === context.user.id)
      throw new ORPCError('CONFLICT', {
        message: 'You cannot change your own role',
      })

    await auth.api.setRole({
      headers: context.headers,
      body: { userId: id, role },
    })

    const [updated] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
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
    if (!user) throw new ORPCError('NOT_FOUND', { message: 'User not found' })

    if (user.id === context.user.id)
      throw new ORPCError('CONFLICT', {
        message: 'You cannot delete your own account',
      })

    await auth.api.removeUser({
      headers: context.headers,
      body: { userId: input.id },
    })
    return user
  })

export const users = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  banUser,
  deleteUser,
}
