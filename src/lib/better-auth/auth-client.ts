import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const {
  signIn,
  signUp,
  signOut,
  updateUser,
  changeEmail,
  changePassword,
  requestPasswordReset,
  resetPassword,
  admin,
} = createAuthClient({
  plugins: [adminClient()],
})
