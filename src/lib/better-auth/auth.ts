import { db } from '#/db'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth/minimal'
import { admin } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

const emails = () => import('#/lib/emails')

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    usePlural: true,
  }),
  advanced: {
    database: {
      generateId: false,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const { sendWelcomeEmail } = await emails()
          await sendWelcomeEmail(user.email, user.name)
        },
      },
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [admin(), tanstackStartCookies()],
})
