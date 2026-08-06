import * as z from 'zod'

// Field rules shared across form schemas
export const emailField = () =>
  z.email({
    error: ({ input }) => (!input ? 'Email is required' : 'Invalid email'),
  })

export const passwordField = () =>
  z.string().min(8, 'Password must be at least 8 characters')
