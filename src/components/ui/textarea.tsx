import * as React from 'react'

import { cn } from '#/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-24 w-full rounded-md border-2 border-input bg-background px-3 py-2 ring-offset-background transition-[color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-sm placeholder:font-medium placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-hidden disabled:opacity-70 aria-invalid:border-destructive!',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
