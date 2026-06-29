import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '#/lib/utils'

const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1.5 rounded-full text-xs font-medium capitalize transition-colors [&>svg]:size-3.5 [&>svg]:stroke-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        success: 'bg-success text-success-foreground',
        warning: 'bg-warning text-warning-foreground',
        info: 'bg-info text-info-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-border text-foreground',
      },
      size: {
        default: 'px-2.5 py-0.5',
        icon: 'p-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  size,
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    render: render ?? <span />,
    props: {
      'data-slot': 'badge',
      className: cn(badgeVariants({ variant, size }), className),
      ...props,
    },
    defaultTagName: 'span',
  })
}

export { Badge, badgeVariants }
