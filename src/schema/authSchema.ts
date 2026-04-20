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
