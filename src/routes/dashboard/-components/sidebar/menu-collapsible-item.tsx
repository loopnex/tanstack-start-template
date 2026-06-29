import { Link } from '@tanstack/react-router'
import { memo } from 'react'

type MenuCollapsibleItemProps = {
  title: string
  url: string
}

const MenuCollapsibleItem = ({ title, url }: MenuCollapsibleItemProps) => {
  return (
    <Link
      to={url}
      activeOptions={{ exact: true }}
      className="relative flex items-center transition-colors before:h-px before:w-[1.6rem] before:bg-border before:transition-colors before:content-[''] focus-visible:outline-hidden"
      activeProps={{
        className:
          'before:bg-primary [&>span]:bg-primary/10 [&>span]:text-primary',
      }}
      inactiveProps={{
        className:
          '[&>span]:text-secondary-foreground/70 [&>span]:hover:bg-secondary [&>span]:in-focus-visible:bg-secondary',
      }}
    >
      <span className="w-full rounded-md px-2.5 py-1.5 text-[15px]">
        {title}
      </span>
    </Link>
  )
}

export default memo(MenuCollapsibleItem)
