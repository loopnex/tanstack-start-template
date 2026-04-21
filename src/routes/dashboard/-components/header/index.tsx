import { buttonVariants } from '#/components/ui/button'
import ThemeToggle from '#/components/ui/theme-toggle'
import { cn } from '#/lib/utils'
import { Link } from '@tanstack/react-router'
import { Home } from 'lucide-react'
import SidebarToggle from './sidebar-toggle'

const Header = () => {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4 dark:bg-card">
      <div className="flex items-center gap-2.5">
        <SidebarToggle />
      </div>
      <div className="flex items-center gap-2.5">
        <Link
          to="/"
          aria-label="Go to homepage"
          title="Go to homepage"
          className={cn(buttonVariants({ variant: 'secondary', size: 'icon' }))}
        >
          <Home />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}

export default Header
