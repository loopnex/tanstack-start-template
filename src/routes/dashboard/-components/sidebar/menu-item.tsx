import { Link } from '@tanstack/react-router'
import { memo } from 'react'

type MenuItemProps = {
  icon: React.ReactNode
  title: string
  url: string
}

const MenuItem = ({ icon, title, url }: MenuItemProps) => {
  return (
    <Link
      to={url}
      activeOptions={{ exact: true }}
      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors focus-visible:outline-hidden"
      activeProps={{ className: 'bg-primary text-primary-foreground' }}
      inactiveProps={{
        className:
          'text-secondary-foreground/70 hover:bg-secondary focus-visible:bg-secondary',
      }}
    >
      {icon}
      <span>{title}</span>
    </Link>
  )
}

export default memo(MenuItem)
