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
  error: unknown,
  setError?: UseFormSetError<T>,
) {
  const { status, message, data } = error as ApiError
  const issues = data?.issues
  if (setError && issues) {
    for (const { path, message: issueMessage } of issues) {
      if (typeof path[0] === 'string') {
        setError(path[0] as Path<T>, { message: issueMessage })
      }
    }
    return
  }
  toast.error(
    status && status >= 500
      ? 'Something went wrong'
      : (message ?? 'Something went wrong'),
  )
}
