import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(main)/')({ component: App })

function App() {
  return <h1 className="mt-8 text-center">Tanstack Start Template</h1>
}
