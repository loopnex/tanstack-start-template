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
import { orpc } from '#/lib/orpc'
import { paginationHandlers } from '#/lib/pagination'
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
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { EllipsisVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useDebounceCallback } from 'usehooks-ts'

// Paginated query for the table (filters come from URL)
const categoriesQuery = (filters: CategoryFilterSchemaType) =>
  orpc.categories.getCategories.queryOptions({ input: filters })

export const Route = createFileRoute('/dashboard/categories/')({
  validateSearch: (s) => categoryFilterSchema.parse(s),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery(deps)),
      context.queryClient.ensureQueryData(
        orpc.categories.getCategoryOptions.queryOptions(),
      ),
    ]),
  component: CategoriesPage,
})

function CategoriesPage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const { data: categories } = useSuspenseQuery(categoriesQuery(search))
  const { data: options } = useSuspenseQuery(
    orpc.categories.getCategoryOptions.queryOptions(),
  )

  const createMutation = useMutation(
    orpc.categories.createCategory.mutationOptions(),
  )
  const updateMutation = useMutation(
    orpc.categories.updateCategory.mutationOptions(),
  )
  const deleteMutation = useMutation(
    orpc.categories.deleteCategory.mutationOptions(),
  )

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
    try {
      if (selected) {
        await updateMutation.mutateAsync({ id: selected.id, ...values })
      } else {
        await createMutation.mutateAsync(values)
      }
    } catch (error) {
      handleErrorResponse(error, form.setError)
      return
    }
    toast.success(selected ? 'Category updated' : 'Category created')
    setFormOpen(false)
  }

  // Delete handler
  const handleDelete = async () => {
    if (!selected) return
    try {
      await deleteMutation.mutateAsync({ id: selected.id })
    } catch (error) {
      handleErrorResponse(error)
      return
    }
    toast.error('Category deleted')
    setDeleteOpen(false)
    if (categories.data.length === 1 && categories.meta.page > 1) {
      navigate({
        search: (prev) => ({ ...prev, page: categories.meta.page - 1 }),
      })
    }
  }

  // Table columns
  const columns: ColumnDef<CategorySchemaType>[] = [
    {
      header: 'Category',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="size-12 shrink-0 overflow-hidden rounded-md bg-secondary">
            {row.original.image && (
              <img
                src={row.original.image.url}
                alt=""
                className="size-12 object-cover"
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
                <Pencil />
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
                <Trash2 />
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
        <h1 className="text-2xl font-medium">Categories</h1>
        <Button onClick={openCreate}>
          <Plus />
          <span>Add Category</span>
        </Button>
      </div>

      <div className="rounded-xl border bg-card pb-6">
        <div className="flex items-center justify-between gap-4 p-6">
          <InputGroup className="max-w-sm">
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

        <DataTable
          data={categories.data}
          columns={columns}
          emptyMessage="No categories found"
        />

        <Pagination meta={categories.meta} {...paginationHandlers(navigate)} />
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
                <Field className="text-center">
                  <FieldLabel>Category Image</FieldLabel>
                  <FileUploader
                    className="mx-auto"
                    key={selected?.id ?? 'new'}
                    fileTypes={['images']}
                    collection="categories"
                    maxSize={5 * 1000 * 1000}
                    initialFiles={
                      selected?.image ? [selected.image] : undefined
                    }
                    onUploadComplete={(r) => {
                      form.setValue('imageMediaId', r.mediaId)
                    }}
                  />
                </Field>
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
                          form.setValue('slug', slugify(e.target.value), {
                            shouldValidate: true,
                          })
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
                      <FieldLabel>Parent Category</FieldLabel>
                      <Select
                        value={field.value ?? null}
                        onValueChange={(v) => field.onChange(v ?? undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {(value: string | null) =>
                              value
                                ? options.find((c) => c.id === value)?.name
                                : 'None'
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>None</SelectItem>
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
              </FieldGroup>
              <DialogFooter>
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
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              isLoading={deleteMutation.isPending}
              disabled={deleteMutation.isPending}
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
