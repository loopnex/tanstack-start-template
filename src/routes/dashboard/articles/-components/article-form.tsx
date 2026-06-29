import {
  FileUploader,
  type UploadResult,
} from '#/components/system/file-uploader'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from '#/components/ui/combobox'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Textarea } from '#/components/ui/textarea'
import { client } from '#/lib/orpc'
import {
  ARTICLE_STATUS,
  articleInputSchema,
  type ArticleInputSchemaType,
} from '#/schema/articleSchema'
import type { CategoryOptionSchemaType } from '#/schema/categorySchema'
import { zodResolver } from '@hookform/resolvers/zod'
import slugify from '@sindresorhus/slugify'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { Controller, useForm, type UseFormReturn } from 'react-hook-form'

const categoryOptionsQuery = queryOptions({
  queryKey: ['categoryOptions'] as const,
  queryFn: () => client.categories.getCategoryOptions(),
})

interface ArticleFormProps {
  defaultValues: ArticleInputSchemaType
  initialThumbnail?: UploadResult | null
  submitLabel: string
  onSubmit: (
    values: ArticleInputSchemaType,
    setError: UseFormReturn<ArticleInputSchemaType>['setError'],
  ) => Promise<void>
}

export function ArticleForm({
  defaultValues,
  initialThumbnail,
  submitLabel,
  onSubmit,
}: ArticleFormProps) {
  const { data: categories } = useSuspenseQuery(categoryOptionsQuery)
  const form = useForm<ArticleInputSchemaType>({
    resolver: zodResolver(articleInputSchema),
    defaultValues,
    mode: 'onChange',
  })

  return (
    <form
      onSubmit={form.handleSubmit(async (v) => onSubmit(v, form.setError))}
      autoComplete="off"
    >
      <FieldSet disabled={form.formState.isSubmitting}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left — content + SEO */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Content</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Controller
                    name="title"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="title">Title</FieldLabel>
                        <Input
                          id="title"
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
                    name="excerpt"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="excerpt">Excerpt</FieldLabel>
                        <Textarea
                          id="excerpt"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </Field>
                    )}
                  />
                  <Controller
                    name="body"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="body">Body</FieldLabel>
                        <Textarea id="body" className="min-h-64" {...field} />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SEO</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Controller
                    name="metaTitle"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="metaTitle">Meta Title</FieldLabel>
                        <Input
                          id="metaTitle"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </Field>
                    )}
                  />
                  <Controller
                    name="metaDescription"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor="metaDescription">
                          Meta Description
                        </FieldLabel>
                        <Textarea
                          id="metaDescription"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </Field>
                    )}
                  />
                </FieldGroup>
              </CardContent>
            </Card>
          </div>

          {/* Right — category + publish settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Publish Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  name="status"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <Select
                        value={field.value}
                        onValueChange={(v) => v && field.onChange(v)}
                      >
                        <SelectTrigger className="w-full capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ARTICLE_STATUS.map((s) => (
                            <SelectItem
                              key={s}
                              value={s}
                              className="capitalize"
                            >
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  name="categoryIds"
                  control={form.control}
                  render={({ field }) => {
                    const selected = categories.filter((c) =>
                      field.value.includes(c.id),
                    )
                    return (
                      <Combobox
                        items={categories}
                        multiple
                        value={selected}
                        itemToStringLabel={(c: CategoryOptionSchemaType) =>
                          c.name
                        }
                        itemToStringValue={(c: CategoryOptionSchemaType) =>
                          c.id
                        }
                        onValueChange={(vals: CategoryOptionSchemaType[]) =>
                          field.onChange(vals.map((c) => c.id))
                        }
                      >
                        <ComboboxChips>
                          <ComboboxValue>
                            {(value: CategoryOptionSchemaType[]) =>
                              value.map((c) => (
                                <ComboboxChip key={c.id}>{c.name}</ComboboxChip>
                              ))
                            }
                          </ComboboxValue>
                          <ComboboxChipsInput placeholder="Add category" />
                        </ComboboxChips>
                        <ComboboxContent>
                          <ComboboxEmpty>No categories found.</ComboboxEmpty>
                          <ComboboxList>
                            {(c: CategoryOptionSchemaType) => (
                              <ComboboxItem key={c.id} value={c}>
                                {c.name}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    )
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Thumbnail</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUploader
                  fileTypes={['images']}
                  collection="thumbnail"
                  maxSize={5 * 1000 * 1000}
                  initialFiles={
                    initialThumbnail ? [initialThumbnail] : undefined
                  }
                  onUploadComplete={(r) => {
                    form.setValue('thumbnailMediaId', r.mediaId)
                  }}
                  maxFiles={5}
                />
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full"
              isLoading={form.formState.isSubmitting}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </FieldSet>
    </form>
  )
}
