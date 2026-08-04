import {
  CloseButton,
  Dialog,
  DialogBackdrop,
  Description as DialogDescription,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import { X } from 'lucide-react'
import type React from 'react'

import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'

const drawerVariants = cva('fixed flex flex-col bg-card outline-none', {
  variants: {
    side: {
      top: 'inset-x-0 top-0 max-h-[calc(100%-6rem)] border-b',
      bottom: 'inset-x-0 bottom-0 max-h-[calc(100%-6rem)] border-t',
      left: 'inset-y-0 left-0 h-full w-full max-w-72 border-r',
      right: 'inset-y-0 right-0 h-full w-full max-w-72 border-l',
    },
  },
  defaultVariants: {
    side: 'right',
  },
})

const transitionClasses: Record<
  NonNullable<VariantProps<typeof drawerVariants>['side']>,
  string
> = {
  right: 'data-closed:translate-x-full',
  left: 'data-closed:-translate-x-full',
  top: 'data-closed:-translate-y-full',
  bottom: 'data-closed:translate-y-full',
}

type DrawerProps = {
  open: boolean
  onClose: (open: boolean) => void
  children: React.ReactNode
}

function Drawer({ open, onClose, children }: DrawerProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {children}
    </Dialog>
  )
}

type DrawerContentProps = Omit<
  React.ComponentProps<typeof DialogPanel>,
  'children'
> &
  VariantProps<typeof drawerVariants> & {
    children?: React.ReactNode
  }

function DrawerContent({
  className,
  children,
  side = 'right',
  ...props
}: DrawerContentProps) {
  return (
    <>
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/20 backdrop-blur-[1px] duration-300 ease-in-out data-closed:opacity-0"
      />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <DialogPanel
          transition
          className={cn(
            'pointer-events-auto transform transition duration-300 ease-in-out sm:duration-400',
            transitionClasses[side ?? 'right'],
            drawerVariants({ side }),
            className,
          )}
          {...props}
        >
          {children}
        </DialogPanel>
      </div>
    </>
  )
}

function DrawerHeader({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between border-b p-3',
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <CloseButton
        aria-label="Close panel"
        className={cn(
          buttonVariants({ variant: 'secondary', size: 'icon-sm' }),
        )}
      >
        <X aria-hidden="true" />
      </CloseButton>
    </div>
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  return (
    <DialogTitle
      className={cn('text-lg font-semibold text-foreground', className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  return (
    <DialogDescription
      className={cn('text-sm font-medium text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle }
