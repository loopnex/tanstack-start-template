import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import { twMerge } from 'tailwind-merge'

// CSS utility
export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

// Format only as date
export const formatDate = (date: string | Date) => {
  if (!date) return

  return format(new Date(date), 'dd MMM yyyy')
}

// Format as date and time
export const formatDateTime = (date: string | Date) => {
  if (!date) return

  return format(new Date(date), 'dd MMM yyyy - hh:mm a')
}
