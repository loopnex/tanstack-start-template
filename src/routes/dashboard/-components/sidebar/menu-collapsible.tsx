import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { cn } from '#/lib/utils'
import { useLocation } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

type MenuCollapsibleProps = {
  icon: React.ReactNode
  title: string
  baseUrl: string
  children: React.ReactNode
}

const MenuCollapsible = ({
  icon,
  title,
  baseUrl,
  children,
}: MenuCollapsibleProps) => {
  const pathName = useLocation({ select: (location) => location.pathname })
  const active = pathName.startsWith(baseUrl)
  const [open, setOpen] = useState(active)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 transition-colors focus-visible:outline-hidden',
          {
            'bg-primary text-primary-foreground': active,
            'text-secondary-foreground/70 hover:bg-secondary focus-visible:bg-secondary':
              !active,
          },
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
        <ChevronDown
          className={`icon transition ${open ? 'rotate-180' : 'rotate-0'}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="my-1.5 ml-5.5 space-y-1.5 border-l">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default MenuCollapsible
