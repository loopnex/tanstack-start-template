import { Button } from '#/components/ui/button'
import { Menu } from 'lucide-react'

const SidebarToggle = () => {
  return (
    <Button aria-label="Toggle sidebar" size="icon-lg" variant="secondary">
      <Menu />
    </Button>
  )
}

export default SidebarToggle
