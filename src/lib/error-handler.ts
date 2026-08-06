import { toORPCError } from '@orpc/client'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

const GENERIC_MESSAGE = 'Something went wrong'

// What oRPC puts in error.data when .input() validation fails
const validationSchema = z.object({
  issues: z.array(
    z.object({
      message: z.string(),
      path: z.array(z.union([z.string(), z.number()])).default([]),
    }),
  ),
})

/**
 * Routes an oRPC error to the UI: validation issues land inline on their field,
 * and anything else — including an issue with no matching field — is a toast.
 */
export function handleErrorResponse<T extends FieldValues>(
  error: unknown,
  form?: UseFormReturn<T>,
) {
  const { status, message, data } = toORPCError(error)
  const validation = validationSchema.safeParse(data)

  if (!validation.success) {
    toast.error(status >= 500 ? GENERIC_MESSAGE : message || GENERIC_MESSAGE)
    return
  }

  const values = form?.getValues()

  validation.data.issues.forEach((issue, index) => {
    const [field] = issue.path
    const rendered = values && typeof field === 'string' && field in values

    if (form && rendered) {
      form.setError(
        issue.path.join('.') as Path<T>,
        { message: issue.message },
        { shouldFocus: index === 0 },
      )
    } else {
      toast.error(issue.message)
    }
  })
}
