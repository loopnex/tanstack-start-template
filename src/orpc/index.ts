import { auth } from '#/lib/better-auth/auth'
import { ORPCError, os as baseOS } from '@orpc/server'

// Base builder with headers context
export const os = baseOS.$context<{ headers: Headers }>()

// Auth middleware — validates the session and adds user/session to context
type Session = typeof auth.$Infer.Session | null
const authMiddleware = os.middleware(async ({ context, next }) => {
  const sessionData: Session = await auth.api.getSession({
    headers: context.headers,
  })

  if (!sessionData?.session) {
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

// Admin-only procedure builder — requires the admin role
export const adminOnly = authorized.use(async ({ context, next }) => {
  if (context.user.role !== 'admin') throw new ORPCError('FORBIDDEN')
  return next()
})
