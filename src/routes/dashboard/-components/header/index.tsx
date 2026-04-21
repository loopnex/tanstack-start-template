import ThemeToggle from '#/components/ui/theme-toggle'
import SidebarToggle from './sidebar-toggle'

const Header = () => {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-6 dark:bg-card">
      <div className="flex items-center gap-2">
        <SidebarToggle />
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  )
}

export default Header
