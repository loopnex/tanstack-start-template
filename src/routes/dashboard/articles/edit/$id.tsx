import { buttonVariants } from '#/components/ui/button'
import { handleErrorResponse } from '#/lib/error-handler'
import { ensureQueryData, orpc } from '#/lib/orpc'
import { cn } from '#/lib/utils'
import type { ArticleInputSchemaType } from '#/schema/articleSchema'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { ArticleForm } from '../-components/article-form'

const articleQuery = (id: string) =>
  orpc.articles.getArticle.queryOptions({ input: { id } })

export const Route = createFileRoute('/dashboard/articles/edit/$id')({
  loader: ({ context, params }) =>
    Promise.all([
      ensureQueryData(
        context.queryClient,
        orpc.categories.getCategoryOptions.queryOptions(),
      ),
      ensureQueryData(context.queryClient, articleQuery(params.id)),
    ]),
  component: EditArticlePage,
})

function EditArticlePage() {
  const { id } = Route.useParams()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const { data: article } = useSuspenseQuery(articleQuery(id))
  const updateMutation = useMutation(
    orpc.articles.updateArticle.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: orpc.articles.key() }),
    }),
  )

  // Update handler
  const onSubmit = (
    values: ArticleInputSchemaType,
    setError: UseFormReturn<ArticleInputSchemaType>['setError'],
  ) => {
    updateMutation.mutate(
      { id, ...values },
      {
        onSuccess: () => {
          toast.success('Article updated')
          navigate({ to: '/dashboard/articles' })
        },
        onError: (error) => handleErrorResponse(error, setError),
      },
    )
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
          <h1 className="text-xl font-semibold">Edit Article</h1>
          <p className="text-sm text-muted-foreground">Update the article</p>
        </div>
      </div>
      <ArticleForm
        defaultValues={{
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt ?? '',
          body: article.body,
          status: article.status,
          metaTitle: article.metaTitle ?? '',
          metaDescription: article.metaDescription ?? '',
          thumbnailMediaId: article.thumbnail?.mediaId,
          categoryIds: article.categoryIds,
        }}
        initialThumbnail={article.thumbnail}
        submitLabel="Update Article"
        onSubmit={onSubmit}
        isPending={updateMutation.isPending}
      />
    </div>
  )
}
