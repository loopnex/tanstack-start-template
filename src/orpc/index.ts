import { auth } from '#/lib/better-auth/auth'
import { ORPCError, os as baseOS } from '@orpc/server'

// Base builder with headers context
export const os = baseOS.$context<{ headers: Headers }>()

// Auth middleware — validates the session and adds user/session to context
const authMiddleware = os.middleware(async ({ context, next }) => {
  const sessionData = await auth.api.getSession({ headers: context.headers })

  if (!sessionData?.session || !sessionData?.user) {
    throw new ORPCError('UNAUTHORIZED')
  }

  return next({
    context: {
      session: sessionData.session,
      user: sessionData.user,
    },
  })
})

// Authenticated procedure builder — auth required
export const authorized = os.use(authMiddleware)
