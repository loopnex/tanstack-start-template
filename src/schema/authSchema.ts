import * as z from 'zod'

// Sign Up Schema
export const signUpSchema = z.object({
  name: z.string().nonempty('Name is required'),
  email: z.email({
    error: ({ input }) => {
      if (!input) {
        return 'Email is required'
      }

      return 'Invalid email'
    },
  }),
  organizationName: z.string().optional(),
  password: z.string().nonempty('Password is required'),
})
export type SignUpSchemaType = z.infer<typeof signUpSchema>

// Sign In Schema
export const signInSchema = z.object({
  email: z.email({
    error: ({ input }) => {
      if (!input) {
        return 'Email is required'
      }

      return 'Invalid email'
    },
  }),
  password: z.string().nonempty('Password is required'),
})
export type SignInSchemaType = z.infer<typeof signInSchema>

// Profile Name Schema
export const profileNameSchema = z.object({
  name: z.string().nonempty('Name is required'),
})
export type ProfileNameSchemaType = z.infer<typeof profileNameSchema>

// Request Password Reset Schema
export const requestPasswordResetSchema = z.object({
  email: z.email({
    error: ({ input }) => {
      if (!input) return 'Email is required'
      return 'Invalid email'
    },
  }),
})
export type RequestPasswordResetSchemaType = z.infer<
  typeof requestPasswordResetSchema
>

// Reset Password Schema
export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().nonempty('Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
export type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>

// Profile Email Schema
export const profileEmailSchema = z.object({
  email: z.email({
    error: ({ input }) => {
      if (!input) return 'Email is required'
      return 'Invalid email address'
    },
  }),
})
export type ProfileEmailSchemaType = z.infer<typeof profileEmailSchema>

// Profile Password Schema
export const profilePasswordSchema = z
  .object({
    currentPassword: z.string().nonempty('Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().nonempty('Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
export type ProfilePasswordSchemaType = z.infer<typeof profilePasswordSchema>
