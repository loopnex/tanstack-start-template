import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { buttonVariants } from '#/components/ui/button'
import {
  Dropdown,
  DropdownItem,
  DropdownItems,
  DropdownLinkItem,
  DropdownTrigger,
} from '#/components/ui/dropdown'
import type { auth } from '#/lib/better-auth/auth'
import { signOut } from '#/lib/better-auth/auth-client'
import { cn } from '#/lib/utils'
import { Link, useRouter } from '@tanstack/react-router'
import { ChevronDown, LayoutGrid, LogOut, UserRound } from 'lucide-react'
import { toast } from 'sonner'

type Session = typeof auth.$Infer.Session | null
const ProfileDropdown = ({ session }: { session: Session }) => {
  const router = useRouter()

  // Handle logout
  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success('Signed out')
          router.navigate({ to: '/auth/sign-in' })
        },
        onError: (ctx) => {
          toast.error(ctx.error.message)
        },
      },
    })
  }

  return (
    <Dropdown>
      <DropdownTrigger
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'h-auto p-0 hover:bg-transparent',
        )}
      >
        <Avatar>
          <AvatarImage
            src={session?.user.image ? session.user.image : undefined}
            alt="Profile image"
          />
          <AvatarFallback>{session?.user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="max-w-40 truncate text-base">
          {session?.user.name}
        </span>
        <ChevronDown className="opacity-60" aria-hidden="true" />
      </DropdownTrigger>
      <DropdownItems>
        <DropdownLinkItem render={<Link to="/dashboard" />}>
          <LayoutGrid className="opacity-60" aria-hidden="true" />
          <span>Dashboard</span>
        </DropdownLinkItem>
        <DropdownLinkItem render={<Link to="/dashboard/profile" />}>
          <UserRound className="opacity-60" aria-hidden="true" />
          <span>Profile</span>
        </DropdownLinkItem>
        <DropdownItem onClick={handleLogout}>
          <LogOut className="opacity-60" aria-hidden="true" />
          <span>Logout</span>
        </DropdownItem>
      </DropdownItems>
    </Dropdown>
  )
}

export default ProfileDropdown
