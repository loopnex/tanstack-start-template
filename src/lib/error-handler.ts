import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

interface ApiError {
  status?: number
  message?: string
  data?: { issues?: z.core.$ZodIssue[] }
}

/**
 * Routes an oRPC error to the UI:
 * - Validation (zod): shown inline on the related form input.
 * - Explicit (conflict, not found…): shown as a toast.
 * - Unknown (500): a generic "Something went wrong" toast.
 */
export function handleErrorResponse<T extends FieldValues>(
  error: ApiError,
  setError?: UseFormSetError<T>,
) {
  const issues = error.data?.issues
  if (setError && issues) {
    for (const { path, message } of issues) {
      if (typeof path?.[0] === 'string') {
        setError(path[0] as Path<T>, { message })
      }
    }
    return
  }
  toast.error(
    error.status && error.status >= 500
      ? 'Something went wrong'
      : (error.message ?? 'Something went wrong'),
  )
}
