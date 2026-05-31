'use client'

import { useMutation } from '@tanstack/react-query'
import { Button } from '@sao-blog/ui/components/button'
import { zodResolver } from '@hookform/resolvers/zod'
import { topicInputSchema } from '@sao-blog/api/schema/topic'
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

type RouterOutputs = InferClientOutputs<typeof client>
type Topic = RouterOutputs['admin']['topic']['getTopics']['data'][number]
type TopicFormValues = z.infer<typeof topicInputSchema>

interface TopicFormProps {
  mode: 'create' | 'edit'
  topic?: Topic
  onSuccess?: () => void
  onCancel?: () => void
}

const emptyTopic: TopicFormValues = {
  id: '',
  name: '',
  slug: '',
  introduce: '',
  description: null,
  color: '#000000',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export function TopicForm({ mode, topic, onSuccess, onCancel }: TopicFormProps) {
  const isEditMode = mode === 'edit'

  const form = useForm<TopicFormValues>({
    resolver: zodResolver(topicInputSchema),
    values:
      isEditMode && topic
        ? {
            id: topic.id,
            name: topic.name,
            slug: topic.slug,
            introduce: topic.introduce,
            description: topic.description,
            color: topic.color ?? '#000000',
            createdAt: new Date(topic.createdAt),
            updatedAt: new Date(topic.updatedAt),
          }
        : {
            ...emptyTopic,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
  })

  const {
    register,
    formState: { errors },
  } = form

  const createTopicMutation = useMutation(
    orpc.admin.topic.createTopic.mutationOptions()
  )
  const updateTopicMutation = useMutation(
    orpc.admin.topic.updateTopic.mutationOptions()
  )

  const isSubmitting =
    createTopicMutation.isPending || updateTopicMutation.isPending

  const submitLabel = isEditMode ? '儲存變更' : '建立專欄'
  const submittingLabel = isEditMode ? '儲存中...' : '建立中...'

  const onSubmit = async (values: TopicFormValues) => {
    try {
      if (isEditMode) {
        await updateTopicMutation.mutateAsync(values)
        toast.success('專欄更新成功！')
      } else {
        await createTopicMutation.mutateAsync(values)
        toast.success('專欄建立成功！')
      }

      await queryClient.invalidateQueries({
        queryKey: orpc.admin.topic.getTopics.queryOptions().queryKey,
      })
      onSuccess?.()
    } catch {
      toast.error(
        isEditMode
          ? '更新專欄時發生錯誤，請稍後再試。'
          : '建立專欄時發生錯誤，請稍後再試。'
      )
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
            placeholder="例如：前端工程筆記"
            aria-invalid={!!errors.name}
          />
          <FieldError errors={errors.name ? [errors.name] : []} />
        </Field>

        <Field data-invalid={!!errors.slug}>
          <FieldLabel>網址別名 (Slug)</FieldLabel>
          <Input
            {...register('slug')}
            placeholder="例如：frontend-notes"
            aria-invalid={!!errors.slug}
          />
          <FieldError errors={errors.slug ? [errors.slug] : []} />
        </Field>

        <Field data-invalid={!!errors.introduce}>
          <FieldLabel>簡介</FieldLabel>
          <Input
            {...register('introduce')}
            placeholder="一句話介紹這個專欄（最多 100 字）"
            aria-invalid={!!errors.introduce}
          />
          <FieldError errors={errors.introduce ? [errors.introduce] : []} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel>描述</FieldLabel>
          <Textarea
            {...register('description', {
              setValueAs: (value) => (value === '' ? null : value),
            })}
            placeholder="關於這個專欄的詳細描述（最多 400 字）..."
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
