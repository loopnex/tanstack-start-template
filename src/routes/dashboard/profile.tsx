import { Button, buttonVariants } from '#/components/ui/button'
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
import {
  changeEmail,
  changePassword,
  updateUser,
} from '#/lib/better-auth/auth-client'
import { cn } from '#/lib/utils'
import type {
  ProfileEmailSchemaType,
  ProfileNameSchemaType,
  ProfilePasswordSchemaType,
} from '#/schema/authSchema'
import {
  profileEmailSchema,
  profileNameSchema,
  profilePasswordSchema,
} from '#/schema/authSchema'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createFileRoute,
  Link,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { session } = useRouteContext({ from: '__root__' })
  const router = useRouter()

  // Name form
  const [namePending, setNamePending] = useState(false)
  const [nameError, setNameError] = useState('')

  const form = useForm<ProfileNameSchemaType>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: { name: session?.user.name ?? '' },
  })

  const onSubmit = async (values: ProfileNameSchemaType) => {
    await updateUser(
      { name: values.name },
      {
        onRequest: () => {
          setNamePending(true)
          setNameError('')
        },
        onSuccess: () => {
          toast.success('Name updated')
          router.invalidate()
        },
        onError: (ctx) => setNameError(ctx.error.message),
      },
    )
    setNamePending(false)
  }

  // Email form
  const [emailPending, setEmailPending] = useState(false)
  const [emailError, setEmailError] = useState('')

  const emailForm = useForm<ProfileEmailSchemaType>({
    resolver: zodResolver(profileEmailSchema),
    defaultValues: { email: session?.user.email ?? '' },
  })

  const onEmailSubmit = async (values: ProfileEmailSchemaType) => {
    await changeEmail(
      { newEmail: values.email },
      {
        onRequest: () => {
          setEmailPending(true)
          setEmailError('')
        },
        onSuccess: () => {
          toast.success('Email updated')
          router.invalidate()
        },
        onError: (ctx) => setEmailError(ctx.error.message),
      },
    )
    setEmailPending(false)
  }

  // Password form
  const [passwordPending, setPasswordPending] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const passwordForm = useForm<ProfilePasswordSchemaType>({
    resolver: zodResolver(profilePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onPasswordSubmit = async (values: ProfilePasswordSchemaType) => {
    await changePassword(
      {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true,
      },
      {
        onRequest: () => {
          setPasswordPending(true)
          setPasswordError('')
        },
        onSuccess: () => {
          toast.success('Password updated')
          passwordForm.reset()
        },
        onError: (ctx) => setPasswordError(ctx.error.message),
      },
    )
    setPasswordPending(false)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
        >
          <ArrowLeft />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Profile Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account information and password
          </p>
        </div>
      </div>

      {/* Display Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Display Name</CardTitle>
          <CardDescription>Update your public display name</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldSet disabled={namePending}>
              <FieldGroup>
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="name">Full Name</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <User2 />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="name"
                          type="text"
                          autoComplete="name"
                          placeholder="John Doe"
                          aria-invalid={fieldState.invalid}
                          {...field}
                        />
                      </InputGroup>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <FormError message={nameError} />

                <Button type="submit" isLoading={namePending}>
                  Update Name
                </Button>
              </FieldGroup>
            </FieldSet>
          </form>
        </CardContent>
      </Card>

      {/* Email Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Address</CardTitle>
          <CardDescription>Update your login email address</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)}>
            <FieldSet disabled={emailPending}>
              <FieldGroup>
                <Controller
                  name="email"
                  control={emailForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="email">Email Address</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <Mail />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          aria-invalid={fieldState.invalid}
                          {...field}
                        />
                      </InputGroup>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <FormError message={emailError} />

                <Button type="submit" isLoading={emailPending}>
                  Update Email
                </Button>
              </FieldGroup>
            </FieldSet>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Change Password</CardTitle>
          <CardDescription>Set a new password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <FieldSet disabled={passwordPending}>
              <FieldGroup>
                <Controller
                  name="currentPassword"
                  control={passwordForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="current-password">
                        Current Password
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <Lock />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="current-password"
                          type={showCurrent ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="Enter current password"
                          aria-invalid={fieldState.invalid}
                          {...field}
                        />
                        <InputGroupButton
                          onClick={() => setShowCurrent((p) => !p)}
                          aria-label={
                            showCurrent ? 'Hide password' : 'Show password'
                          }
                        >
                          {showCurrent ? <Eye /> : <EyeOff />}
                        </InputGroupButton>
                      </InputGroup>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  name="newPassword"
                  control={passwordForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="new-password">
                        New Password
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <Lock />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="new-password"
                          type={showNew ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Minimum 8 characters"
                          aria-invalid={fieldState.invalid}
                          {...field}
                        />
                        <InputGroupButton
                          onClick={() => setShowNew((p) => !p)}
                          aria-label={
                            showNew ? 'Hide password' : 'Show password'
                          }
                        >
                          {showNew ? <Eye /> : <EyeOff />}
                        </InputGroupButton>
                      </InputGroup>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  name="confirmPassword"
                  control={passwordForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="confirm-password">
                        Confirm New Password
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <Lock />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="confirm-password"
                          type={showConfirm ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Confirm new password"
                          aria-invalid={fieldState.invalid}
                          {...field}
                        />
                        <InputGroupButton
                          onClick={() => setShowConfirm((p) => !p)}
                          aria-label={
                            showConfirm ? 'Hide password' : 'Show password'
                          }
                        >
                          {showConfirm ? <Eye /> : <EyeOff />}
                        </InputGroupButton>
                      </InputGroup>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <FormError message={passwordError} />

                <Button type="submit" isLoading={passwordPending}>
                  Update Password
                </Button>
              </FieldGroup>
            </FieldSet>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
