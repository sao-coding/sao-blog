'use client'

import { useMutation } from '@tanstack/react-query'
import { Button } from '@sao-blog/ui/components/button'
import { zodResolver } from '@hookform/resolvers/zod'
import { categoryInputSchema } from '@sao-blog/api/schema/category'
import { useForm } from 'react-hook-form'
import type z from 'zod'
import { toast } from 'sonner'
import { Loader2Icon } from 'lucide-react'
import { client, orpc, queryClient } from '@/utils/orpc'

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@sao-blog/ui/components/field'
import { Input } from '@sao-blog/ui/components/input'
import { Textarea } from '@sao-blog/ui/components/textarea'
import type { InferClientOutputs } from '@orpc/client'

type RouterOutputs = InferClientOutputs<typeof client>;
type Category = RouterOutputs['admin']['category']['getCategories']['data'][number]
type CategoryFormValues = z.infer<typeof categoryInputSchema>

interface CategoryFormProps {
  mode: 'create' | 'edit'
  category?: Category
  onSuccess?: () => void
  onCancel?: () => void
}

const emptyCategory: CategoryFormValues = {
  id: '',
  name: '',
  slug: '',
  description: null,
  color: '#000000',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export function CategoryForm({ mode, category, onSuccess, onCancel }: CategoryFormProps) {
  const isEditMode = mode === 'edit'

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryInputSchema),
    values:
      isEditMode && category
        ? {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            color: category.color ?? '#000000',
            createdAt: new Date(category.createdAt),
            updatedAt: new Date(category.updatedAt),
          }
        : {
            ...emptyCategory,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
  })

  const {
    register,
    formState: { errors },
  } = form

  const createCategoryMutation = useMutation(
    orpc.admin.category.createCategory.mutationOptions()
  )
  const updateCategoryMutation = useMutation(
    orpc.admin.category.updateCategory.mutationOptions()
  )

  const isSubmitting =
    createCategoryMutation.isPending || updateCategoryMutation.isPending

  const submitLabel = isEditMode ? '儲存變更' : '建立分類'
  const submittingLabel = isEditMode ? '儲存中...' : '建立中...'

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      if (isEditMode) {
        await updateCategoryMutation.mutateAsync(values)
        toast.success('分類更新成功！')
      } else {
        await createCategoryMutation.mutateAsync(values)
        toast.success('分類建立成功！')
      }

      await queryClient.invalidateQueries({
        queryKey: orpc.admin.category.getCategories.queryOptions().queryKey,
      })
      onSuccess?.()
    } catch {
      toast.error(isEditMode ? '更新分類時發生錯誤，請稍後再試。' : '建立分類時發生錯誤，請稍後再試。')
    }
  }

  const onValidationError = () => {
    toast.error('表單驗證失敗，請確認欄位內容。')
  }

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(onSubmit, onValidationError)}
    >
      <FieldGroup className="space-y-4">
        <Field data-invalid={!!errors.name}>
          <FieldLabel>名稱</FieldLabel>
          <Input
            {...register('name')}
            placeholder="例如：前端技術"
            aria-invalid={!!errors.name}
          />
          <FieldError errors={errors.name ? [errors.name] : []} />
        </Field>

        <Field data-invalid={!!errors.slug}>
          <FieldLabel>網址別名 (Slug)</FieldLabel>
          <Input
            {...register('slug')}
            placeholder="例如：frontend"
            aria-invalid={!!errors.slug}
          />
          <FieldError errors={errors.slug ? [errors.slug] : []} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel>描述</FieldLabel>
          <Textarea
            {...register('description', {
              setValueAs: (value) => (value === '' ? null : value),
            })}
            placeholder="關於這個分類的簡短描述..."
            aria-invalid={!!errors.description}
          />
          <FieldError errors={errors.description ? [errors.description] : []} />
        </Field>

        <Field data-invalid={!!errors.color}>
          <FieldLabel>顏色</FieldLabel>
          <Input
            {...register('color', {
              setValueAs: (value) => (value === '' ? null : value),
            })}
            type="color"
            aria-invalid={!!errors.color}
          />
          <FieldError errors={errors.color ? [errors.color] : []} />
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              {submittingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  )
}