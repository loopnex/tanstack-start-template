import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndexPage,
})

function DashboardIndexPage() {
  return <h1 className="text-xl font-semibold">Dashboard Overview</h1>
}
