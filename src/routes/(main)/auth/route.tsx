import NotFound from '#/components/system/not-found'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import * as z from 'zod'

const authSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(main)/auth')({
  validateSearch: authSearchSchema,
  beforeLoad: async ({ context: { session }, search }) => {
    if (session) {
      const redirectTo =
        search.redirect &&
        search.redirect.startsWith('/') &&
        !search.redirect.startsWith('/auth')
          ? search.redirect
          : '/dashboard'
      throw redirect({ to: redirectTo })
    }
  },
  component: AuthLayout,
  notFoundComponent: () => {
    return (
      <div className="grid h-full place-items-center">
        <NotFound />
      </div>
    )
  },
})

function AuthLayout() {
  return (
    <div className="grid grow place-items-center bg-neutral-100 px-4 py-6 dark:bg-background">
      <main className="flex w-full max-w-md flex-col gap-8">
        <Outlet />
      </main>
    </div>
  )
}
