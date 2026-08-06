import { emailField, passwordField } from '#/schema/fields'
import { paginationSchema } from '#/schema/paginationSchema'
import * as z from 'zod'

// User (list/detail)
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullish(),
  role: z.string().nullish(),
  banned: z.boolean().nullish(),
  banReason: z.string().nullish(),
  banExpires: z.coerce.date().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type UserSchemaType = z.infer<typeof userSchema>

// User list filters
export const userFilterSchema = z.object({
  search: z.string().trim().optional(),
  role: z.string().optional(),
  ...paginationSchema.shape,
})
export type UserFilterSchemaType = z.infer<typeof userFilterSchema>

// Create user
export const userInputSchema = z.object({
  name: z.string().nonempty('Name is required'),
  email: emailField(),
  password: passwordField(),
  role: z.string().nonempty('Role is required'),
})
export type UserInputSchemaType = z.infer<typeof userInputSchema>

// Update user (no password)
export const userUpdateSchema = userInputSchema.omit({ password: true })
export type UserUpdateSchemaType = z.infer<typeof userUpdateSchema>

// Ban / unban a user
export const userBanSchema = z.object({
  banned: z.boolean(),
  banReason: z.string().optional(),
})
export type UserBanSchemaType = z.infer<typeof userBanSchema>

/**
 * One schema for create+edit — password is only required in 'create' mode.
 */
export const userFormSchema = (mode: 'create' | 'edit') =>
  userUpdateSchema
    .extend({ password: z.string().optional() })
    .refine((data) => mode === 'edit' || (data.password?.length ?? 0) >= 8, {
      message: 'Password must be at least 8 characters',
      path: ['password'],
    })
export type UserFormSchemaType = z.infer<ReturnType<typeof userFormSchema>>
