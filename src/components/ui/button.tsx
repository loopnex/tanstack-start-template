import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'

import { cn } from '#/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border-2 border-transparent text-sm font-medium whitespace-nowrap ring-offset-background transition-[color,box-shadow,transform] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/85 focus-visible:ring-primary/30',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/85 focus-visible:ring-destructive-foreground/30',
        outline:
          'border-input bg-background hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-foreground/20',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-foreground/20',
        ghost:
          'hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-foreground/20',
        link: 'text-primary underline-offset-4 hover:underline',
        info: 'bg-info text-info-foreground hover:bg-info/85 focus-visible:ring-info-foreground/30',
        success:
          'bg-success text-success-foreground hover:bg-success/85 focus-visible:ring-success-foreground/30',
        warning:
          'bg-warning text-warning-foreground hover:bg-warning/85 focus-visible:ring-warning-foreground/30',
      },
      size: {
        default: 'h-10 px-3.5 py-2',
        sm: 'h-9 gap-1.5 px-3 [&_svg]:size-4',
        lg: 'h-11 px-6',
        icon: 'size-10',
        'icon-sm': 'size-9 [&_svg]:size-4',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  isLoading,
  disabled,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean
  }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <LoaderCircle className="animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  )
}

export { Button, buttonVariants }
