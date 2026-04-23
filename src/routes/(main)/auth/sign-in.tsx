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
  InputGroupButton,
  InputGroupInput,
} from '#/components/ui/input-group'
import { signIn } from '#/lib/better-auth/auth-client'
import type { SignInSchemaType } from '#/schema/authSchema'
import { signInSchema } from '#/schema/authSchema'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

export const Route = createFileRoute('/(main)/auth/sign-in')({
  component: SignInPage,
})

function SignInPage() {
  const [pendingAuth, setPendingAuth] = useState(false)
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const form = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: SignInSchemaType) => {
    await signIn.email(
      { email: values.email, password: values.password },
      {
        onRequest: () => {
          setPendingAuth(true)
          setFormError('')
        },
        onSuccess: () => {
          toast.success('Login successful!')
          router.navigate({ to: '/dashboard' })
        },
        onError: (ctx) => setFormError(ctx.error.message),
      },
    )
    setPendingAuth(false)
  }

  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription className="text-center">
          Enter your account details to login
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

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <Lock />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Password"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                      <InputGroupButton
                        onClick={() => setShowPassword((p) => !p)}
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showPassword ? <Eye /> : <EyeOff />}
                      </InputGroupButton>
                    </InputGroup>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link
                  to="/auth/request-password-reset"
                  className="text-sm underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-hidden"
                >
                  Forgot password?
                </Link>
              </div>

              <FormError message={formError} />

              <Button type="submit" className="w-full" isLoading={pendingAuth}>
                Sign In
              </Button>
            </FieldGroup>
          </FieldSet>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-1 text-center text-sm">
          <span className="text-muted-foreground">
            Don&apos;t have an account?
          </span>
          <Link
            to="/auth/sign-up"
            className="underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-hidden"
          >
            Sign Up
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
