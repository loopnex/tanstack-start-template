import { Button } from '#/components/ui/button'
import { toORPCError } from '@orpc/client'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useRouter } from '@tanstack/react-router'
import { RotateCcw } from 'lucide-react'

/**
 * Route error boundary. Anything that isn't an ORPCError reads as a 500,
 * and only those are masked in production.
 */
const Error = ({ error, reset }: ErrorComponentProps) => {
  const router = useRouter()
  const { status, message } = toORPCError(error)
  const isServerError = status >= 500

  const shown = import.meta.env.DEV
    ? error.message || message
    : isServerError
      ? 'Something went wrong'
      : message

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <div className="flex items-center justify-center divide-x-2 font-medium">
        <span className="pr-4 text-3xl text-shadow-2xs sm:text-6xl">
          {status}
        </span>
        <p className="pl-4 text-lg text-muted-foreground sm:text-2xl">
          {shown}
        </p>
      </div>
      <Button
        variant="secondary"
        className="w-fit"
        onClick={() => {
          reset()
          router.invalidate()
        }}
      >
        <RotateCcw />
        <span>Reset</span>
      </Button>
    </div>
  )
}

export default Error
