import ThemeToggle from '#/components/ui/theme-toggle'
import { Link } from '@tanstack/react-router'

const Navbar = () => {
  return (
    <nav className="border-b py-3 dark:bg-card">
      <div className="container flex items-center justify-between gap-4">
        <Link to="/" className="shrink-0">
          <img src="/logo.svg" alt="Brand Logo" width={100} height={40} />
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}

export default Navbar
