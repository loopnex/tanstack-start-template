import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer'
import { useSidebar } from '#/hooks/useSidebar'
import { useLocation } from '@tanstack/react-router'
import { useLayoutEffect } from 'react'
import SidebarMenu from './menu'

const Sidebar = () => {
  const { isMobile, openMobile, setOpenMobile } = useSidebar()
  const pathname = useLocation({ select: (location) => location.pathname })

  useLayoutEffect(() => {
    if (isMobile) setOpenMobile(false)
  }, [pathname, isMobile, setOpenMobile])

  if (isMobile) {
    return (
      <Drawer open={openMobile} onClose={setOpenMobile}>
        <DrawerContent side="left">
          <DrawerHeader>
            <DrawerTitle>Brand Logo</DrawerTitle>
          </DrawerHeader>
          <SidebarMenu />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <aside
      suppressHydrationWarning
      className="hidden w-64 shrink-0 flex-col border-r bg-card transition-[margin] duration-300 md:flex sidebar-collapsed:-ml-64"
    >
      <SidebarMenu />
    </aside>
  )
}

export default Sidebar
