import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { cn } from '#/lib/utils'

// Root
const Dropdown = MenuPrimitive.Root

// Trigger
function DropdownTrigger({ children, ...props }: MenuPrimitive.Trigger.Props) {
  return (
    <MenuPrimitive.Trigger data-slot="dropdown-trigger" {...props}>
      {children}
    </MenuPrimitive.Trigger>
  )
}

// Dropdown Items
function DropdownItems({
  className,
  children,
  side = 'bottom',
  sideOffset = 6,
  align = 'end',
  alignOffset = 0,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset'
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="isolate z-40"
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-items"
          className={cn(
            'min-w-40 origin-(--transform-origin) rounded-md border bg-card p-1.5 text-foreground shadow-lg outline-hidden duration-150 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-transparent dark:bg-secondary',
            className,
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

// Dropdown Item
function DropdownItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-item"
      className={cn(
        'flex w-full cursor-default items-center gap-2 rounded px-2.5 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted [&_svg]:pointer-events-none [&_svg]:size-5.5 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]',
        className,
      )}
      {...props}
    />
  )
}

// Dropdown Link Item
function DropdownLinkItem({
  className,
  closeOnClick = true,
  ...props
}: MenuPrimitive.LinkItem.Props) {
  return (
    <MenuPrimitive.LinkItem
      data-slot="dropdown-link-item"
      closeOnClick={closeOnClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-sm text-current no-underline outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted [&_svg]:pointer-events-none [&_svg]:size-5.5 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]',
        className,
      )}
      {...props}
    />
  )
}

export {
  Dropdown,
  DropdownItem,
  DropdownItems,
  DropdownLinkItem,
  DropdownTrigger,
}
