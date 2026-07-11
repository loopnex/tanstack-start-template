import { Button } from '#/components/ui/button'
import { useRouter } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

const NotFound = () => {
  const { history } = useRouter()

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center justify-center divide-x-2 font-medium">
        <span className="pr-4 text-3xl text-shadow-2xs sm:text-6xl">404</span>
        <p className="pl-4 text-lg text-muted-foreground sm:text-2xl">
          Not Found
        </p>
      </div>
      <Button
        variant="secondary"
        className="w-fit"
        onClick={() => history.back()}
      >
        <ArrowLeft />
        <span>Go back</span>
      </Button>
    </div>
  )
}

export default NotFound
