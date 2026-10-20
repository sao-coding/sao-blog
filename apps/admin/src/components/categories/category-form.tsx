'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiErrorMessage, LOCALE_LABELS, LOCALES, type Locale } from '@/components/translations/locales'
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

  // 其他語系的分類名稱 / 描述（原文為上方的名稱與描述；留空表示該語系沿用原文）
  const translationLocales = LOCALES.filter((l): l is Exclude<Locale, 'zh-TW'> => l !== 'zh-TW')
  type TranslationFields = Record<(typeof translationLocales)[number], { name: string; description: string }>
  const emptyTranslations = Object.fromEntries(
    translationLocales.map((l) => [l, { name: '', description: '' }])
  ) as TranslationFields
  const [translations, setTranslations] = useState<TranslationFields>(emptyTranslations)

  const { data: translationData } = useQuery({
    ...orpc.admin.category.getCategoryTranslations.queryOptions({ input: { categoryId: category?.id ?? '' } }),
    enabled: isEditMode && Boolean(category?.id),
  })
  useEffect(() => {
    const next = { ...emptyTranslations }
    for (const t of translationData?.data ?? []) {
      if (t.locale in next) next[t.locale as keyof TranslationFields] = { name: t.name, description: t.description ?? '' }
    }
    setTranslations(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationData])

  const upsertTranslationMutation = useMutation(
    orpc.admin.category.upsertCategoryTranslation.mutationOptions()
  )

  const createCategoryMutation = useMutation(
    orpc.admin.category.createCategory.mutationOptions()
  )
  const updateCategoryMutation = useMutation(
    orpc.admin.category.updateCategory.mutationOptions()
  )

  const isSubmitting =
    createCategoryMutation.isPending ||
    updateCategoryMutation.isPending ||
    upsertTranslationMutation.isPending

  const submitLabel = isEditMode ? '儲存變更' : '建立分類'
  const submittingLabel = isEditMode ? '儲存中...' : '建立中...'

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      const res = isEditMode
        ? await updateCategoryMutation.mutateAsync(values)
        : await createCategoryMutation.mutateAsync(values)
      const error = apiErrorMessage(res)
      const categoryId = res.data?.id
      if (error || !categoryId) {
        toast.error(error ?? '分類儲存失敗')
        return
      }

      // 儲存有填寫的其他語系譯名
      for (const locale of translationLocales) {
        const t = translations[locale]
        if (!t.name.trim()) continue
        const tr = await upsertTranslationMutation.mutateAsync({
          categoryId,
          locale,
          name: t.name.trim(),
          description: t.description.trim() ? t.description.trim() : null,
        })
        const trError = apiErrorMessage(tr)
        if (trError) toast.error(`${LOCALE_LABELS[locale]} 譯名儲存失敗：${trError}`)
      }
      toast.success(isEditMode ? '分類更新成功！' : '分類建立成功！')

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

        {translationLocales.map((locale) => (
          <Field key={locale}>
            <FieldLabel>{LOCALE_LABELS[locale]} 名稱 / 描述（選填，留空沿用原文）</FieldLabel>
            <Input
              value={translations[locale].name}
              onChange={(e) =>
                setTranslations((prev) => ({ ...prev, [locale]: { ...prev[locale], name: e.target.value } }))
              }
              placeholder={`${LOCALE_LABELS[locale]} 名稱`}
              maxLength={100}
            />
            <Input
              value={translations[locale].description}
              onChange={(e) =>
                setTranslations((prev) => ({ ...prev, [locale]: { ...prev[locale], description: e.target.value } }))
              }
              placeholder={`${LOCALE_LABELS[locale]} 描述`}
            />
          </Field>
        ))}

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