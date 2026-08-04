import { TriangleAlert } from 'lucide-react'

export const FormError = ({ message }: { message?: string }) => {
  if (!message) return null

  return (
    <p className="flex items-center gap-2 rounded-md bg-warning px-4 py-3 text-sm font-medium tracking-wide text-warning-foreground">
      <TriangleAlert className="size-5 shrink-0 stroke-[1.5]" />
      <span>{message}</span>
    </p>
  )
}
