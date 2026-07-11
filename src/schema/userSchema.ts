import { paginationSchema } from '#/schema/paginationSchema'
import * as z from 'zod'

export const USER_ROLES = ['user', 'admin'] as const

// User (list/detail)
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullish(),
  role: z.enum(USER_ROLES).nullable(),
  banned: z.boolean().nullable(),
  banReason: z.string().nullish(),
  banExpires: z.coerce.date().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type UserSchemaType = z.infer<typeof userSchema>

// User list filters
export const userFilterSchema = z.object({
  search: z.string().trim().optional(),
  role: z.enum(USER_ROLES).optional(),
  ...paginationSchema.shape,
})
export type UserFilterSchemaType = z.infer<typeof userFilterSchema>

// Create user
export const userInputSchema = z.object({
  name: z.string().nonempty('Name is required'),
  email: z.string().nonempty('Email is required').email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(USER_ROLES),
})
export type UserInputSchemaType = z.infer<typeof userInputSchema>

// Update user (role only — name/email/password aren't editable here)
export const userUpdateSchema = z.object({
  role: z.enum(USER_ROLES),
})
export type UserUpdateSchemaType = z.infer<typeof userUpdateSchema>

// Ban / unban a user — its own action, separate from updateUser
export const userBanSchema = z.object({
  banned: z.boolean(),
  banReason: z.string().optional(),
})
export type UserBanSchemaType = z.infer<typeof userBanSchema>
