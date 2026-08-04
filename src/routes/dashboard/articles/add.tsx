import { buttonVariants } from '#/components/ui/button'
import { handleErrorResponse } from '#/lib/error-handler'
import { ensureQueryData, orpc } from '#/lib/orpc'
import { cn } from '#/lib/utils'
import type { ArticleInputSchemaType } from '#/schema/articleSchema'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { ArticleForm } from './-components/article-form'

export const Route = createFileRoute('/dashboard/articles/add')({
  loader: ({ context }) =>
    ensureQueryData(
      context.queryClient,
      orpc.categories.getCategoryOptions.queryOptions(),
    ),
  component: AddArticlePage,
})

function AddArticlePage() {
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const createMutation = useMutation(
    orpc.articles.createArticle.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: orpc.articles.key() }),
    }),
  )

  // Create handler
  const onSubmit = (
    values: ArticleInputSchemaType,
    setError: UseFormReturn<ArticleInputSchemaType>['setError'],
  ) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        toast.success('Article created')
        navigate({ to: '/dashboard/articles' })
      },
      onError: (error) => handleErrorResponse(error, setError),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/articles"
          className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
        >
          <ArrowLeft />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Add Article</h1>
          <p className="text-sm text-muted-foreground">Create a new article</p>
        </div>
      </div>
      <ArticleForm
        defaultValues={{
          title: '',
          slug: '',
          excerpt: '',
          body: '',
          status: 'draft',
          metaTitle: '',
          metaDescription: '',
          thumbnailMediaId: undefined,
          categoryIds: [],
        }}
        submitLabel="Create Article"
        onSubmit={onSubmit}
        isPending={createMutation.isPending}
      />
    </div>
  )
}
