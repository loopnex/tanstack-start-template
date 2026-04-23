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
import { signUp } from '#/lib/better-auth/auth-client'
import type { SignUpSchemaType } from '#/schema/authSchema'
import { signUpSchema } from '#/schema/authSchema'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Building, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

export const Route = createFileRoute('/(main)/auth/sign-up')({
  component: SignUpPage,
})

function SignUpPage() {
  const [pendingAuth, setPendingAuth] = useState(false)
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const form = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', organizationName: '', password: '' },
  })

  const onSubmit = async (values: SignUpSchemaType) => {
    await signUp.email(
      { name: values.name, email: values.email, password: values.password },
      {
        onRequest: () => {
          setPendingAuth(true)
          setFormError('')
        },
        onSuccess: () => {
          router.invalidate()
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
        <CardTitle className="text-2xl">Sign Up</CardTitle>
        <CardDescription className="text-center">
          Create an account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
          <FieldSet disabled={pendingAuth}>
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="name">Full Name</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <UserRound />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="name"
                        placeholder="John Doe"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                    </InputGroup>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
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
                name="organizationName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel optional htmlFor="organizationName">
                      Organization Name
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <Building />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="organizationName"
                        placeholder="Acme Inc"
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
                        autoComplete="new-password"
                        placeholder="Password"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                      <InputGroupButton
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                        onClick={() => setShowPassword((p) => !p)}
                      >
                        {showPassword ? <Eye /> : <EyeOff />}
                      </InputGroupButton>
                    </InputGroup>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <FormError message={formError} />
              <Button
                type="submit"
                className="mt-2 w-full"
                isLoading={pendingAuth}
              >
                Sign Up
              </Button>
            </FieldGroup>
          </FieldSet>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-1 text-center text-sm">
          <span className="text-muted-foreground">
            Already have an account?
          </span>
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
