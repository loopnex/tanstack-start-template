import { createContext, useState } from 'react'
import { useMediaQuery } from 'usehooks-ts'

export type SidebarContextType = {
  state: 'expanded' | 'collapsed'
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

export const SidebarContext = createContext<SidebarContextType | null>(null)

function readSidebarStorage(): boolean {
  try {
    const value = localStorage.getItem('sidebar')
    return value !== null ? value === 'true' : true
  } catch {
    return true
  }
}

function setSidebarHtmlAttr(open: boolean) {
  document.documentElement.setAttribute(
    'data-sidebar-state',
    open ? 'expanded' : 'collapsed',
  )
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpenState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return readSidebarStorage()
  })
  const [openMobile, setOpenMobile] = useState(false)
  const isMobile = useMediaQuery('(max-width: 1024px)', {
    initializeWithValue: false,
  })

  const setOpen = (value: boolean) => {
    setOpenState(value)
    setSidebarHtmlAttr(value)
    try {
      localStorage.setItem('sidebar', String(value))
    } catch {}
  }

  const toggleSidebar = () => {
    if (isMobile) {
      setOpenMobile((prev) => !prev)
    } else {
      setOpen(!open)
    }
  }

  return (
    <SidebarContext.Provider
      value={{
        state: open ? 'expanded' : 'collapsed',
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        isMobile,
        toggleSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}
