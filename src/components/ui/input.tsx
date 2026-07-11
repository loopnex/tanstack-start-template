import { Input as InputPrimitive } from '@base-ui/react/input'
import * as React from 'react'

import { cn } from '#/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-10 w-full rounded-md border-2 border-input bg-background px-3 py-2 ring-offset-background transition-[color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-sm placeholder:font-medium placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-hidden disabled:cursor-not-allowed disabled:bg-muted aria-invalid:border-destructive!',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
