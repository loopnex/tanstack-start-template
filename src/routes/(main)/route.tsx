import { Outlet, createFileRoute } from '@tanstack/react-router'
import Navbar from './-components/navbar'

export const Route = createFileRoute('/(main)')({
  component: MainLayout,
})

function MainLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <Outlet />
      {/* Footer Here */}
    </div>
  )
}
