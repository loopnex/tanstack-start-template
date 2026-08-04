import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '#/components/ui/field'
import { FormError } from '#/components/ui/form-error'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '#/components/ui/input-group'
import { requestPasswordReset } from '#/lib/better-auth/auth-client'
import type { RequestPasswordResetSchemaType } from '#/schema/authSchema'
import { requestPasswordResetSchema } from '#/schema/authSchema'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Mail } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

export const Route = createFileRoute('/(main)/auth/request-password-reset')({
  component: RequestPasswordResetPage,
})

function RequestPasswordResetPage() {
  const [pendingAuth, setPendingAuth] = useState(false)
  const [formError, setFormError] = useState('')

  const form = useForm({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: RequestPasswordResetSchemaType) => {
    await requestPasswordReset(
      {
        email: values.email,
        redirectTo: '/auth/reset-password',
      },
      {
        onRequest: () => {
          setPendingAuth(true)
          setFormError('')
        },
        onError: (ctx: { error: { message: string } }) =>
          setFormError(ctx.error.message),
        onSuccess: () => {
          setFormError(
            'If this email exists in our system, check your email for the reset link',
          )
        },
      },
    )
    setPendingAuth(false)
  }

  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription className="text-center">
          Enter your account email to receive a reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldSet disabled={pendingAuth}>
            <FieldGroup>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <Mail />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="john@example.com"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                    </InputGroup>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <FormError message={formError} />

              <Button type="submit" className="w-full" isLoading={pendingAuth}>
                Send Reset Link
              </Button>
            </FieldGroup>
          </FieldSet>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-1 text-center text-sm">
          <span className="text-muted-foreground">Remember your password?</span>
          <Link
            to="/auth/sign-in"
            className="underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-hidden"
          >
            Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
