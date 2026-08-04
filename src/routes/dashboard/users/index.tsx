import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { DataTable } from '#/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Dropdown,
  DropdownItem,
  DropdownItems,
  DropdownTrigger,
} from '#/components/ui/dropdown'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '#/components/ui/input-group'
import { Pagination } from '#/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Textarea } from '#/components/ui/textarea'
import { handleErrorResponse } from '#/lib/error-handler'
import { ensureQueryData, orpc } from '#/lib/orpc'
import { paginationHandlers } from '#/lib/pagination'
import { cn, formatDateTime } from '#/lib/utils'
import type {
  UserFilterSchemaType,
  UserFormSchemaType,
  UserSchemaType,
} from '#/schema/userSchema'
import {
  USER_ROLES,
  userFilterSchema,
  userFormSchema,
} from '#/schema/userSchema'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useRouteContext,
} from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ArrowLeft,
  Ban,
  EllipsisVertical,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useDebounceCallback } from 'usehooks-ts'

// Paginated query for the table (filters come from URL)
const usersQuery = (filters: UserFilterSchemaType) =>
  orpc.users.getUsers.queryOptions({ input: filters })

export const Route = createFileRoute('/dashboard/users/')({
  validateSearch: (s) => userFilterSchema.parse(s),
  // Admin only
  beforeLoad: ({ context: { session } }) => {
    if (session?.user.role !== 'admin') throw redirect({ to: '/dashboard' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    ensureQueryData(context.queryClient, usersQuery(deps)),
  component: UsersPage,
})

function UsersPage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const { session } = useRouteContext({ from: '__root__' })
  const { data: users } = useSuspenseQuery(usersQuery(search))

  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: orpc.users.key() })

  const createMutation = useMutation(
    orpc.users.createUser.mutationOptions({ onSuccess: invalidate }),
  )
  const updateMutation = useMutation(
    orpc.users.updateUser.mutationOptions({ onSuccess: invalidate }),
  )
  const banMutation = useMutation(
    orpc.users.banUser.mutationOptions({ onSuccess: invalidate }),
  )
  const deleteMutation = useMutation(
    orpc.users.deleteUser.mutationOptions({ onSuccess: invalidate }),
  )

  const isSaving = createMutation.isPending || updateMutation.isPending

  const [formOpen, setFormOpen] = useState(false)
  const [banOpen, setBanOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<UserSchemaType | null>(null)
  const [banReason, setBanReason] = useState('')

  // Search (debounced)
  const debouncedSearch = useDebounceCallback((value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: value || undefined,
        page: undefined,
      }),
    })
  }, 600)

  const form = useForm<UserFormSchemaType>({
    resolver: zodResolver(userFormSchema(selected ? 'edit' : 'create')),
    defaultValues: { name: '', email: '', password: '', role: 'user' },
    mode: 'onChange',
  })

  // Open create dialog
  const openCreate = () => {
    setSelected(null)
    form.reset({ name: '', email: '', password: '', role: 'user' })
    setFormOpen(true)
  }

  // Open edit dialog
  const openEdit = (user: UserSchemaType) => {
    setSelected(user)
    form.reset({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role ?? 'user',
    })
    setFormOpen(true)
  }

  // Open ban/unban dialog
  const openBan = (user: UserSchemaType) => {
    setSelected(user)
    setBanReason('')
    setBanOpen(true)
  }

  // Create / update handler
  const onSubmit = (values: UserFormSchemaType) => {
    const callbacks = {
      onSuccess: () => {
        toast.success(selected ? 'User updated' : 'User created')
        setFormOpen(false)
      },
      onError: (error: unknown) => handleErrorResponse(error, form.setError),
    }

    if (selected) {
      updateMutation.mutate(
        {
          id: selected.id,
          name: values.name,
          email: values.email,
          role: values.role,
        },
        callbacks,
      )
    } else {
      createMutation.mutate(
        {
          name: values.name,
          email: values.email,
          password: values.password ?? '',
          role: values.role,
        },
        callbacks,
      )
    }
  }

  // Ban / unban handler
  const handleBanToggle = () => {
    if (!selected) return
    const wasBanned = selected.banned
    banMutation.mutate(
      {
        id: selected.id,
        banned: !wasBanned,
        banReason: banReason || undefined,
      },
      {
        onSuccess: () => {
          toast.success(wasBanned ? 'User unbanned' : 'User banned')
          setBanOpen(false)
        },
        onError: (error) => handleErrorResponse(error),
      },
    )
  }

  // Delete handler
  const handleDelete = () => {
    if (!selected) return
    deleteMutation.mutate(
      { id: selected.id },
      {
        onSuccess: () => {
          toast.success('User deleted')
          setDeleteOpen(false)
          if (users.data.length === 1 && users.meta.page > 1) {
            navigate({
              search: (prev) => ({ ...prev, page: users.meta.page - 1 }),
            })
          }
        },
        onError: (error) => handleErrorResponse(error),
      },
    )
  }

  // Table columns
  const columns: ColumnDef<UserSchemaType>[] = [
    {
      header: 'User',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={row.original.image ?? undefined} alt="" />
            <AvatarFallback>{row.original.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessorKey: 'role',
      cell: ({ row }) => (
        <Badge variant={row.original.role === 'admin' ? 'info' : 'secondary'}>
          {row.original.role ?? 'user'}
        </Badge>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'banned',
      cell: ({ row }) => (
        <Badge variant={row.original.banned ? 'destructive' : 'success'}>
          {row.original.banned ? 'Banned' : 'Active'}
        </Badge>
      ),
    },
    {
      header: 'Created',
      accessorKey: 'createdAt',
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      header: 'Action',
      cell: ({ row }) => {
        const isSelf = row.original.id === session?.user.id
        return (
          <Dropdown>
            <DropdownTrigger
              className={cn(
                buttonVariants({ variant: 'outline', size: 'icon' }),
              )}
            >
              <EllipsisVertical />
            </DropdownTrigger>
            <DropdownItems>
              <DropdownItem>
                <button onClick={() => openEdit(row.original)}>
                  <Pencil />
                  <span>Edit</span>
                </button>
              </DropdownItem>
              <DropdownItem disabled={isSelf}>
                <button disabled={isSelf} onClick={() => openBan(row.original)}>
                  {row.original.banned ? <ShieldCheck /> : <Ban />}
                  <span>{row.original.banned ? 'Unban' : 'Ban'}</span>
                </button>
              </DropdownItem>
              <DropdownItem disabled={isSelf}>
                <button
                  className="text-destructive-foreground"
                  disabled={isSelf}
                  onClick={() => {
                    setSelected(row.original)
                    setDeleteOpen(true)
                  }}
                >
                  <Trash2 />
                  <span>Delete</span>
                </button>
              </DropdownItem>
            </DropdownItems>
          </Dropdown>
        )
      },
    },
  ]

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
          >
            <ArrowLeft />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage accounts, roles and access
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          <span>Add User</span>
        </Button>
      </div>

      <div className="rounded-xl border bg-card pb-6">
        <div className="flex items-center gap-4 p-6">
          <InputGroup className="max-w-sm">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Search users..."
              defaultValue={search.search ?? ''}
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </InputGroup>

          <Select
            value={search.role ?? null}
            onValueChange={(v) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  role: v ?? undefined,
                  page: undefined,
                }),
              })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue>
                {(value: string | null) =>
                  value ? (
                    <span className="capitalize">{value}</span>
                  ) : (
                    'All roles'
                  )
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All Roles</SelectItem>
              {USER_ROLES.map((role) => (
                <SelectItem key={role} value={role} className="capitalize">
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DataTable
          data={users.data}
          columns={columns}
          emptyMessage="No users found"
        />

        <Pagination meta={users.meta} {...paginationHandlers(navigate)} />
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>
              {selected ? 'Update the user details' : 'Create a new user'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
            <FieldSet disabled={isSaving}>
              <FieldGroup>
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="name">Name</FieldLabel>
                      <Input id="name" autoFocus {...field} />
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
                      <Input id="email" type="email" {...field} />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                {!selected && (
                  <Controller
                    name="password"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <Input
                          id="password"
                          type="password"
                          autoComplete="new-password"
                          {...field}
                          value={field.value ?? ''}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                )}
                <Controller
                  name="role"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Role</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => v && field.onChange(v)}
                      >
                        <SelectTrigger className="w-full capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map((role) => (
                            <SelectItem
                              key={role}
                              value={role}
                              className="capitalize"
                            >
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </FieldGroup>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSaving}>
                  {selected ? 'Update User' : 'Create User'}
                </Button>
              </DialogFooter>
            </FieldSet>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ban / unban confirmation */}
      <AlertDialog open={banOpen} onOpenChange={setBanOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selected?.banned ? 'Unban User' : 'Ban User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selected?.banned ? (
                <>
                  Unban{' '}
                  <span className="font-medium text-foreground">
                    {selected.name}
                  </span>
                  ? They&apos;ll be able to sign in again.
                </>
              ) : (
                <>
                  Ban{' '}
                  <span className="font-medium text-foreground">
                    {selected?.name}
                  </span>
                  ? They won&apos;t be able to sign in.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!selected?.banned && (
            <Field>
              <FieldLabel htmlFor="banReason" optional>
                Ban reason
              </FieldLabel>
              <Textarea
                id="banReason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </Field>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={banMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant={selected?.banned ? 'default' : 'destructive'}
              isLoading={banMutation.isPending}
              onClick={handleBanToggle}
            >
              {selected?.banned ? 'Unban' : 'Ban'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Delete{' '}
              <span className="font-medium text-foreground">
                {selected?.name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              isLoading={deleteMutation.isPending}
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
