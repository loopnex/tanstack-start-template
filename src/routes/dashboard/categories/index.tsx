import { FileUploader } from '#/components/system/file-uploader'
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
import { client, safeClient } from '#/lib/orpc'
import { cn, formatDateTime } from '#/lib/utils'
import {
  categoryFilterSchema,
  type CategoryFilterSchemaType,
  categoryInputSchema,
  type CategoryInputSchemaType,
  type CategorySchemaType,
} from '#/schema/categorySchema'
import { zodResolver } from '@hookform/resolvers/zod'
import slugify from '@sindresorhus/slugify'
import {
  keepPreviousData,
  queryOptions,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ArrowLeft,
  EllipsisVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useDebounceCallback } from 'usehooks-ts'

// Paginated query for the table (filters come from URL)
const categoriesQuery = (filters: CategoryFilterSchemaType) =>
  queryOptions({
    queryKey: ['categories', filters] as const,
    queryFn: () => client.categories.getCategories(filters),
    // Keep the current rows on screen while the next page loads (no blank flash)
    placeholderData: keepPreviousData,
  })

// Full id/name list for the parent select and parent-name lookup (unpaginated)
const categoryOptionsQuery = queryOptions({
  queryKey: ['categoryOptions'] as const,
  queryFn: () => client.categories.getCategoryOptions(),
})

export const Route = createFileRoute('/dashboard/categories/')({
  validateSearch: (s) => categoryFilterSchema.parse(s),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery(deps)),
      context.queryClient.ensureQueryData(categoryOptionsQuery),
    ]),
  component: CategoriesPage,
})

function CategoriesPage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const queryClient = useQueryClient()
  const { data, isPlaceholderData } = useQuery(categoriesQuery(search))
  const { data: categories, meta } = data!
  const { data: options } = useSuspenseQuery(categoryOptionsQuery)

  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<CategorySchemaType | null>(null)

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

  const form = useForm<CategoryInputSchemaType>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: { name: '', slug: '', description: '' },
    mode: 'onChange',
  })

  // Open create dialog
  const openCreate = () => {
    setSelected(null)
    form.reset({
      name: '',
      slug: '',
      description: '',
      parentId: undefined,
      imageMediaId: undefined,
    })
    setFormOpen(true)
  }

  // Open edit dialog
  const openEdit = (category: CategorySchemaType) => {
    setSelected(category)
    form.reset({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      parentId: category.parentId ?? undefined,
      imageMediaId: category.image?.mediaId,
    })
    setFormOpen(true)
  }

  // Create / update handler
  const onSubmit = async (values: CategoryInputSchemaType) => {
    const [error] = selected
      ? await safeClient.categories.updateCategory({
          id: selected.id,
          ...values,
        })
      : await safeClient.categories.createCategory(values)
    if (error) {
      handleErrorResponse(error, form.setError)
      return
    }
    toast.success(selected ? 'Category updated' : 'Category created')
    setFormOpen(false)
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['categoryOptions'] })
  }

  // Delete handler
  const handleDelete = async () => {
    if (!selected) return
    const [error] = await safeClient.categories.deleteCategory({
      id: selected.id,
    })
    if (error) {
      handleErrorResponse(error)
      return
    }
    toast.success('Category deleted')
    setDeleteOpen(false)
    queryClient.invalidateQueries({ queryKey: ['categoryOptions'] })
    if (categories.length === 1 && meta.page > 1) {
      navigate({ search: (prev) => ({ ...prev, page: meta.page - 1 }) })
    } else {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    }
  }

  // Table columns
  const columns: ColumnDef<CategorySchemaType>[] = [
    {
      header: 'Category',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-md bg-secondary">
            {row.original.image && (
              <img
                src={row.original.image.url}
                alt=""
                className="size-10 object-cover"
              />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.slug}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Parent',
      accessorKey: 'parentId',
      cell: ({ row }) =>
        options.find((c) => c.id === row.original.parentId)?.name ?? '—',
    },
    {
      header: 'Created',
      accessorKey: 'createdAt',
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      header: 'Action',
      cell: ({ row }) => (
        <Dropdown>
          <DropdownTrigger
            className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
          >
            <EllipsisVertical />
          </DropdownTrigger>
          <DropdownItems>
            <DropdownItem>
              <button onClick={() => openEdit(row.original)}>
                <Pencil className="icon" />
                <span>Edit</span>
              </button>
            </DropdownItem>
            <DropdownItem>
              <button
                className="text-destructive-foreground"
                onClick={() => {
                  setSelected(row.original)
                  setDeleteOpen(true)
                }}
              >
                <Trash2 className="icon" />
                <span>Delete</span>
              </button>
            </DropdownItem>
          </DropdownItems>
        </Dropdown>
      ),
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
          <h1 className="text-2xl font-medium">Categories</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          <span>Add Category</span>
        </Button>
      </div>

      <div className="rounded-xl border bg-card pb-6">
        <div className="flex items-center justify-between gap-4 p-6">
          <InputGroup className="max-w-xs">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Search categories..."
              defaultValue={search.search ?? ''}
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </InputGroup>
        </div>

        <div
          className={cn(
            'transition-opacity',
            isPlaceholderData && 'pointer-events-none opacity-60',
          )}
        >
          <DataTable
            data={categories}
            columns={columns}
            emptyMessage="No categories yet"
          />
        </div>

        <Pagination
          meta={meta}
          onPageChange={(page) =>
            navigate({ search: (prev) => ({ ...prev, page }) })
          }
          onLimitChange={(limit) =>
            navigate({
              search: (prev) => ({ ...prev, limit, page: undefined }),
            })
          }
        />
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? 'Update the category details'
                : 'Create a new category'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
            <FieldSet disabled={form.formState.isSubmitting}>
              <FieldGroup>
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="name">Name</FieldLabel>
                      <Input
                        id="name"
                        autoFocus
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          form.setValue('slug', slugify(e.target.value))
                        }}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  name="slug"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="slug">Slug</FieldLabel>
                      <Input
                        id="slug"
                        {...field}
                        disabled
                        className="disabled:opacity-75"
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  name="parentId"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Parent</FieldLabel>
                      <Select
                        value={field.value ?? 'none'}
                        onValueChange={(v) =>
                          field.onChange(!v || v === 'none' ? undefined : v)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {options
                            .filter((c) => c.id !== selected?.id)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                <Controller
                  name="description"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="description">Description</FieldLabel>
                      <Textarea
                        id="description"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </Field>
                  )}
                />
                <Field>
                  <FieldLabel>Image</FieldLabel>
                  <FileUploader
                    key={selected?.id ?? 'new'}
                    fileTypes={['images']}
                    collection="categories"
                    maxSize={5 * 1024 * 1024}
                    initialFiles={
                      selected?.image ? [selected.image] : undefined
                    }
                    onUploadComplete={(r) => {
                      form.setValue('imageMediaId', r.mediaId)
                    }}
                  />
                </Field>
              </FieldGroup>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={form.formState.isSubmitting}>
                  {selected ? 'Update Category' : 'Create Category'}
                </Button>
              </DialogFooter>
            </FieldSet>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Delete{' '}
              <span className="font-medium text-foreground">
                {selected?.name}
              </span>
              ? Sub-categories will move to the top level.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
