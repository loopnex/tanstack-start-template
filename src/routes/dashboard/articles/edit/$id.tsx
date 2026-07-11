import { buttonVariants } from '#/components/ui/button'
import { handleErrorResponse } from '#/lib/error-handler'
import { orpc } from '#/lib/orpc'
import { cn } from '#/lib/utils'
import type { ArticleInputSchemaType } from '#/schema/articleSchema'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
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
      context.queryClient.ensureQueryData(
        orpc.categories.getCategoryOptions.queryOptions(),
      ),
      context.queryClient.ensureQueryData(articleQuery(params.id)),
    ]),
  component: EditArticlePage,
})

function EditArticlePage() {
  const { id } = Route.useParams()
  const navigate = Route.useNavigate()
  const { data: article } = useSuspenseQuery(articleQuery(id))
  const updateMutation = useMutation(
    orpc.articles.updateArticle.mutationOptions(),
  )

  // Update handler
  const onSubmit = async (
    values: ArticleInputSchemaType,
    setError: UseFormReturn<ArticleInputSchemaType>['setError'],
  ) => {
    try {
      await updateMutation.mutateAsync({ id, ...values })
    } catch (error) {
      handleErrorResponse(error, setError)
      return
    }
    toast.success('Article updated')
    navigate({ to: '/dashboard/articles' })
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
      />
    </div>
  )
}
