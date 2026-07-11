import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { buttonVariants } from '#/components/ui/button'
import {
  Dropdown,
  DropdownItem,
  DropdownItems,
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
          toast.success('You are now logged out!')
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
        <DropdownItem>
          <Link to="/dashboard">
            <LayoutGrid className="icon opacity-60" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
        </DropdownItem>
        <DropdownItem>
          <Link to="/dashboard/profile">
            <UserRound className="icon opacity-60" aria-hidden="true" />
            <span>Profile</span>
          </Link>
        </DropdownItem>
        <DropdownItem>
          <button onClick={handleLogout}>
            <LogOut className="icon opacity-60" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </DropdownItem>
      </DropdownItems>
    </Dropdown>
  )
}

export default ProfileDropdown
