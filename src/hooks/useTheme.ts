import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark' | 'system'

/**
 * Module-level store, so every caller shares one value and one OS-preference
 * listener. The theme class is already applied before hydration.
 */
const listeners = new Set<() => void>()
let theme: Theme = 'system'
// Module-scoped, otherwise the browser can garbage-collect the listener
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
  const value = useSyncExternalStore<Theme>(
    subscribe,
    () => theme,
    () => 'system',
  )
  return { theme: value, setTheme }
}
