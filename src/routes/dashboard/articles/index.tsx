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
import { Badge } from '#/components/ui/badge'
import { buttonVariants } from '#/components/ui/button'
import { DataTable } from '#/components/ui/data-table'
import {
  Dropdown,
  DropdownItem,
  DropdownItems,
  DropdownTrigger,
} from '#/components/ui/dropdown'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '#/components/ui/input-group'
import { Pagination } from '#/components/ui/pagination'
import { handleErrorResponse } from '#/lib/error-handler'
import { orpc } from '#/lib/orpc'
import { paginationHandlers } from '#/lib/pagination'
import { cn, formatDateTime } from '#/lib/utils'
import {
  articleFilterSchema,
  type ArticleFilterSchemaType,
  type ArticleSchemaType,
} from '#/schema/articleSchema'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { EllipsisVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useDebounceCallback } from 'usehooks-ts'

// Paginated query for the table (filters come from URL)
const articlesQuery = (filters: ArticleFilterSchemaType) =>
  orpc.articles.getArticles.queryOptions({ input: filters })

export const Route = createFileRoute('/dashboard/articles/')({
  validateSearch: (search) => articleFilterSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(articlesQuery(deps)),
  component: ArticlesPage,
})

function ArticlesPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: articles } = useSuspenseQuery(articlesQuery(search))
  const deleteMutation = useMutation(
    orpc.articles.deleteArticle.mutationOptions(),
  )

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<ArticleSchemaType | null>(null)

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

  // Delete handler
  const handleDelete = async () => {
    if (!selected) return
    try {
      await deleteMutation.mutateAsync({ id: selected.id })
    } catch (error) {
      handleErrorResponse(error)
      return
    }
    toast.success('Article deleted')
    setDeleteOpen(false)
    const currentPage = search.page ?? 1
    if (articles.data.length === 1 && currentPage > 1) {
      navigate({ search: (prev) => ({ ...prev, page: currentPage - 1 }) })
    }
  }

  // Table columns
  const columns: ColumnDef<ArticleSchemaType>[] = [
    {
      header: 'Article',
      accessorKey: 'title',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-md bg-secondary">
            {row.original.thumbnail && (
              <img
                src={row.original.thumbnail.url}
                alt=""
                className="size-10 object-cover"
              />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-medium">{row.original.title}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.slug}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === 'published' ? 'success' : 'secondary'
          }
        >
          {row.original.status}
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
      cell: ({ row }) => (
        <Dropdown>
          <DropdownTrigger
            className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
          >
            <EllipsisVertical />
          </DropdownTrigger>
          <DropdownItems>
            <DropdownItem>
              <Link
                to="/dashboard/articles/edit/$id"
                params={{ id: row.original.id }}
              >
                <Pencil className="icon" />
                <span>Edit</span>
              </Link>
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
        <h1 className="text-2xl font-medium">Articles</h1>
        <Link to="/dashboard/articles/add" className={cn(buttonVariants())}>
          <Plus />
          <span>Add Article</span>
        </Link>
      </div>

      <div className="rounded-xl border bg-card pb-6">
        <div className="flex items-center justify-between gap-4 p-6">
          <InputGroup className="max-w-sm">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Search articles..."
              defaultValue={search.search ?? ''}
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </InputGroup>
        </div>

        <DataTable
          data={articles.data}
          columns={columns}
          emptyMessage="No articles found"
        />

        <Pagination meta={articles.meta} {...paginationHandlers(navigate)} />
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Delete{' '}
              <span className="font-medium text-foreground">
                {selected?.title}
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
