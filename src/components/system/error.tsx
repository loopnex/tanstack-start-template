import { Button } from '#/components/ui/button'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useRouter } from '@tanstack/react-router'
import { RotateCcw } from 'lucide-react'

const Error = ({ error, reset }: ErrorComponentProps) => {
  const router = useRouter()

  // Reveal the real error only in development
  const message = import.meta.env.DEV
    ? error.message || 'Something went wrong'
    : 'Something went wrong'

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center justify-center divide-x-2 font-medium">
        <span className="pr-4 text-3xl text-shadow-2xs sm:text-6xl">500</span>
        <p className="pl-4 text-lg text-muted-foreground sm:text-2xl">
          {message}
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
