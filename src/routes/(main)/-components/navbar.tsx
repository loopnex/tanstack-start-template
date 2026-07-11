import ProfileDropdown from '#/components/system/profile-dropdown'
import { buttonVariants } from '#/components/ui/button'
import ThemeToggle from '#/components/ui/theme-toggle'
import { cn } from '#/lib/utils'
import { Link, useRouteContext } from '@tanstack/react-router'

const Navbar = () => {
  const { session } = useRouteContext({ from: '__root__' })

  return (
    <nav className="flex h-14 items-center border-b">
      <div className="container flex items-center justify-between gap-4">
        <Link to="/" className="shrink-0">
          <img src="/logo.svg" alt="Brand Logo" width={100} height={40} />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {session ? (
            <ProfileDropdown session={session} />
          ) : (
            <Link to="/auth/sign-in" className={cn(buttonVariants())}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
