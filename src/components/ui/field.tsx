import { Label } from '#/components/ui/label'
import { cn } from '#/lib/utils'

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn('flex flex-col gap-6 disabled:opacity-50', className)}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-title"
      className={cn('text-base font-semibold', className)}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-group"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    />
  )
}

function FieldSeparator({ className, ...props }: React.ComponentProps<'hr'>) {
  return (
    <hr
      data-slot="field-separator"
      className={cn('border-border', className)}
      {...props}
    />
  )
}

function Field({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function FieldLabel({
  optional,
  children,
  ...props
}: React.ComponentProps<typeof Label> & { optional?: boolean }) {
  return (
    <Label data-slot="field-label" {...props}>
      {children}
      {optional && (
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          (Optional)
        </span>
      )}
    </Label>
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function FieldError({
  className,
  errors,
  ...props
}: React.ComponentProps<'p'> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const message = errors?.find((e) => e?.message)?.message
  if (!message) return null
  return (
    <p
      role="alert"
      data-slot="field-error"
      className={cn('text-sm text-destructive-foreground', className)}
      {...props}
    >
      {message}
    </p>
  )
}

export {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
  FieldTitle,
}
