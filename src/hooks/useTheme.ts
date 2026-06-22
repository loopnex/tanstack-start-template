import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark' | 'system'

/**
 * Module-level store so every useTheme() caller shares one value and one OS-preference listener.
 * The inline THEME_INIT_SCRIPT already applied the correct class before hydration, so we read the value here without re-applying.
 */
const listeners = new Set<() => void>()
let theme: Theme = 'system'
// Held in a module variable so the browser can't garbage-collect it and silently
// stop firing the 'change' event.
const darkQuery =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

function read(): Theme {
  const stored = localStorage.getItem('theme')
  return stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : 'system'
}

function apply(next: Theme) {
  const resolved =
    next === 'system' ? (darkQuery?.matches ? 'dark' : 'light') : next
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

if (darkQuery) {
  theme = read()
  // Re-resolve when the OS preference changes while in system mode.
  darkQuery.addEventListener('change', () => {
    if (theme === 'system') apply('system')
  })
}

function setTheme(next: Theme) {
  theme = next
  localStorage.setItem('theme', next)
  apply(next)
  listeners.forEach((notify) => notify())
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => listeners.delete(notify)
}

export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void } {
  const value = useSyncExternalStore(
    subscribe,
    () => theme,
    () => 'system' as Theme,
  )
  return { theme: value, setTheme }
}
