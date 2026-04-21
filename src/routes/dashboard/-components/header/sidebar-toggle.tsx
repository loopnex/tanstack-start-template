import { Button } from '#/components/ui/button'
import { useSidebar } from '#/hooks/useSidebar'
import { Menu } from 'lucide-react'

const SidebarToggle = () => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      aria-label="Toggle sidebar"
      size="icon"
      variant="secondary"
      onClick={toggleSidebar}
    >
      <Menu />
    </Button>
  )
}

export default SidebarToggle
