import * as React from 'react'

import { cn } from '#/lib/utils'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        'flex h-10 w-full items-center rounded-md border-2 border-input bg-background transition-[color,box-shadow] has-disabled:opacity-70 has-[[data-slot=input-group-control]:focus-visible]:border-primary has-[input[aria-invalid=true]]:border-destructive!',
        className,
      )}
      {...props}
    />
  )
}

function InputGroupAddon({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-group-addon"
      className={cn(
        'flex shrink-0 items-center px-3 text-muted-foreground [&>svg]:size-5 [&>svg]:stroke-[1.5]',
        className,
      )}
      onClick={(e) => {
        e.currentTarget.parentElement?.querySelector('input')?.focus()
      }}
      {...props}
    />
  )
}

const groupButtonVariants = cva(
  'mx-1 my-1 inline-flex shrink-0 cursor-pointer items-center self-stretch rounded px-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring [&>svg]:size-5 [&>svg]:stroke-[1.5]',
  {
    variants: {
      variant: {
        default: null,
        secondary: 'bg-secondary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function InputGroupButton({
  className,
  type = 'button',
  variant,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof groupButtonVariants>) {
  return (
    <button
      type={type}
      data-slot="input-group-button"
      className={cn(groupButtonVariants({ variant, className }))}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input-group-control"
      className={cn(
        'size-full placeholder:text-muted-foreground first:rounded-l-sm first:pl-3 last:rounded-r-sm last:pr-3 focus-visible:outline-hidden',
        className,
      )}
      {...props}
    />
  )
}

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput }
