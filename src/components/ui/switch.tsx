import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

import { cn } from '#/lib/utils'

const switchVariants = cva(
  'peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent p-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50 data-unchecked:bg-input',
  {
    variants: {
      size: {
        default: 'h-7 w-12',
        sm: 'h-6 w-10',
      },
    },
    defaultVariants: { size: 'default' },
  },
)

const thumbVariants = cva(
  'pointer-events-none block rounded-full bg-background shadow-sm transition-transform data-unchecked:translate-x-0',
  {
    variants: {
      size: {
        default: 'size-5.5 data-checked:translate-x-5',
        sm: 'size-4.5 data-checked:translate-x-4',
      },
    },
    defaultVariants: { size: 'default' },
  },
)

function Switch({
  className,
  size = 'default',
  ...props
}: SwitchPrimitive.Root.Props & VariantProps<typeof switchVariants>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(switchVariants({ size, className }))}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(thumbVariants({ size }))}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
