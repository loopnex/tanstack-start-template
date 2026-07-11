import type {
  MenuButtonProps,
  MenuItemProps,
  MenuItemsProps,
} from '@headlessui/react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'

import { cn } from '#/lib/utils'

// Root
const Dropdown = ({ children, ...props }: { children: React.ReactNode }) => {
  return (
    <Menu as="div" {...props}>
      {children}
    </Menu>
  )
}

// Trigger
const DropdownTrigger = ({ children, ...props }: MenuButtonProps) => {
  return <MenuButton {...props}>{children}</MenuButton>
}

// Dropdown Items
const DropdownItems = ({ children, className }: MenuItemsProps) => {
  return (
    <MenuItems
      transition
      anchor="bottom end"
      className={cn(
        'z-40 min-w-40 origin-top-right rounded-md border bg-white p-1.5 shadow-lg transition duration-100 ease-out [--anchor-gap:--spacing(1.5)] focus:outline-hidden data-closed:scale-95 data-closed:opacity-0 dark:border-transparent dark:bg-secondary',
        className,
      )}
    >
      {children}
    </MenuItems>
  )
}

// Dropdown Item
const DropdownItem = ({ children, ...props }: MenuItemProps<'button'>) => {
  return (
    <MenuItem
      className={cn(
        'flex w-full items-center gap-2 rounded px-2.5 py-1.5 data-focus:bg-muted',
      )}
      {...props}
    >
      {children}
    </MenuItem>
  )
}

export { Dropdown, DropdownItem, DropdownItems, DropdownTrigger }
