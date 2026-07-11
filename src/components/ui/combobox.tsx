import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { Check, ChevronDown, X } from 'lucide-react'

import { cn } from '#/lib/utils'

const Combobox = ComboboxPrimitive.Root

const ComboboxValue = ComboboxPrimitive.Value

function ComboboxChips({
  className,
  children,
  ...props
}: ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.InputGroup>
      <ComboboxPrimitive.Chips
        data-slot="combobox-chips"
        className={cn(
          'relative flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border-2 border-input bg-background px-3 py-2 pr-9 text-sm transition-[color,box-shadow] focus-within:border-primary has-disabled:opacity-50 has-aria-invalid:border-destructive!',
          className,
        )}
        {...props}
      >
        {children}
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
          <ChevronDown className="size-5 stroke-[1.5]" />
        </span>
      </ComboboxPrimitive.Chips>
    </ComboboxPrimitive.InputGroup>
  )
}

function ComboboxChip({
  className,
  children,
  ...props
}: ComboboxPrimitive.Chip.Props) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        'inline-flex items-center gap-1 rounded bg-secondary py-0.5 pr-1 pl-2 text-xs font-medium text-secondary-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ChipRemove
        aria-label="Remove"
        className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-3.5 stroke-2" />
      </ComboboxPrimitive.ChipRemove>
    </ComboboxPrimitive.Chip>
  )
}

function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chips-input"
      className={cn(
        'min-w-24 flex-1 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <div className="relative">
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        className={cn(
          'h-10 w-full rounded-md border-2 border-input bg-background px-3 py-2 pr-9 text-sm outline-hidden transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary disabled:opacity-50 aria-invalid:border-destructive!',
          className,
        )}
        {...props}
      />
      <ComboboxPrimitive.Icon className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
        <ChevronDown className="size-5 stroke-[1.5] text-muted-foreground" />
      </ComboboxPrimitive.Icon>
    </div>
  )
}

function ComboboxContent({
  className,
  children,
  sideOffset = 6,
  align = 'start',
  side = 'bottom',
  ...props
}: ComboboxPrimitive.Popup.Props & {
  sideOffset?: number
  align?: ComboboxPrimitive.Positioner.Props['align']
  side?: ComboboxPrimitive.Positioner.Props['side']
}) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        className="isolate z-50"
        sideOffset={sideOffset}
        align={align}
        side={side}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            'relative isolate z-50 max-h-(--available-height) min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-md border bg-white p-1.5 text-foreground shadow-lg duration-150 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-transparent dark:bg-secondary',
            className,
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        'py-6 text-center text-sm text-muted-foreground empty:py-0',
        className,
      )}
      {...props}
    />
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(className)}
      {...props}
    />
  )
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        'relative flex w-full cursor-default items-center gap-2 rounded px-2.5 py-2 pr-8 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted',
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
        <Check className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
}
