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
            <DrawerTitle className="sr-only">Navigation</DrawerTitle>
            <img src="/logo.svg" alt="Brand Logo" width={100} height={40} />
          </DrawerHeader>
          <SidebarMenu />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card transition-[margin] duration-300 md:flex sidebar-collapsed:-ml-64">
      <div className="flex h-14 shrink-0 items-center justify-center border-b px-4">
        <img src="/logo.svg" alt="Brand Logo" width={100} height={40} />
      </div>
      <SidebarMenu />
    </aside>
  )
}

export default Sidebar
