import { Button } from '#/components/ui/button'
import { admin } from '#/lib/better-auth/auth-client'
import { useRouteContext } from '@tanstack/react-router'
import { UserRoundCog, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

// Sticky notice shown while an admin is impersonating another user
const ImpersonationBanner = () => {
  const { session } = useRouteContext({ from: '__root__' })
  const [pending, setPending] = useState(false)

  if (!session?.session.impersonatedBy) return null

  // Stop impersonating and return to the admin users page
  const handleStop = async () => {
    await admin.stopImpersonating({
      fetchOptions: {
        onRequest: () => {
          setPending(true)
        },
        onError: (ctx) => {
          toast.error(ctx.error.message)
          setPending(false)
          return
        },
      },
    })

    // Full reload so the root session context is rebuilt
    window.location.href = '/dashboard/users'
  }

  return (
    <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-warning px-4 py-1.5 text-sm">
      <div className="flex items-center gap-1">
        <UserRoundCog className="icon text-warning-foreground" />
        <span>
          Viewing as <span className="font-semibold">{session.user.name}</span>
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleStop}
        isLoading={pending}
      >
        {!pending && <X />}
        <span>Exit Impersonation</span>
      </Button>
    </div>
  )
}

export default ImpersonationBanner
