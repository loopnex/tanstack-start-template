import ThemeToggle from '#/components/ui/theme-toggle'
import { Link } from '@tanstack/react-router'

const Navbar = () => {
  return (
    <nav className="border-b py-3">
      <div className="container flex items-center justify-between gap-4">
        <Link to="/" className="shrink-0">
          <img src="/logo.svg" alt="Brand Logo" width={100} height={40} />
        </Link>
        <ThemeToggle />
      </div>
    </nav>
  )
}

export default Navbar
