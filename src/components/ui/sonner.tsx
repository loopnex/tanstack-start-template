import { useTheme } from '#/hooks/useTheme'
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import type { ToasterProps } from 'sonner'
import { Toaster as Sonner } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="bottom-center"
      richColors
      icons={{
        success: <CircleCheckIcon className="icon" />,
        info: <InfoIcon className="icon" />,
        warning: <TriangleAlertIcon className="icon" />,
        error: <OctagonXIcon className="icon" />,
        loading: <Loader2Icon className="icon animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--card)',
          '--normal-text': 'var(--card-foreground)',
          '--normal-border': 'var(--border)',
          '--success-bg': 'var(--success)',
          '--success-text': 'var(--success-foreground)',
          '--success-border': 'var(--success)',
          '--error-bg': 'var(--destructive)',
          '--error-text': 'var(--destructive-foreground)',
          '--error-border': 'var(--destructive)',
          '--info-bg': 'var(--info)',
          '--info-text': 'var(--info-foreground)',
          '--info-border': 'var(--info)',
          '--warning-bg': 'var(--warning)',
          '--warning-text': 'var(--warning-foreground)',
          '--warning-border': 'var(--warning)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'shadow-sm!',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
