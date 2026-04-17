import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(main)/')({ component: App })

function App() {
  return <h1 className="my-8 text-center">Home Page</h1>
}
