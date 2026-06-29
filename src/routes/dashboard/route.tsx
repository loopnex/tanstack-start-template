import NotFound from '#/components/system/not-found'
import { SidebarProvider } from '#/providers/sidebar-provider'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import Header from './-components/header'
import Sidebar from './-components/sidebar'

export const Route = createFileRoute('/dashboard')({
  notFoundComponent: () => {
    return (
      <div className="grid h-full place-items-center">
        <NotFound />
      </div>
    )
  },
  beforeLoad: async ({ context: { session }, location }) => {
    if (!session) {
      throw redirect({
        to: '/auth/sign-in',
        search: { redirect: location.href },
      })
    }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="fixed flex size-full">
        <Sidebar />
        <div className="flex w-full flex-col overflow-hidden">
          <Header />
          <main className="grow overflow-y-auto bg-muted dark:bg-background">
            <div className="container h-full py-6">
              <Outlet />
            </div>
          </main>
          {/* Notification Side Panel Here */}
        </div>
      </div>
    </SidebarProvider>
  )
}
