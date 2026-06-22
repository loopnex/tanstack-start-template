import { useTheme } from '#/hooks/useTheme'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from './button'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  function toggleTheme() {
    const next =
      theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const label =
    theme === 'system'
      ? 'Theme mode: system. Click to switch to light mode.'
      : `Theme mode: ${theme}. Click to switch mode.`

  return (
    <Button
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      size="icon"
      variant="secondary"
    >
      {theme === 'light' ? (
        <Moon />
      ) : theme === 'dark' ? (
        <Sun />
      ) : (
        <Monitor />
      )}
    </Button>
  )
}
