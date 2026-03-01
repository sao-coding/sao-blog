'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

import { ApiResponse } from '@/types/api'
import { TopicItem } from '@/types/topic'
import { updateTopics } from '../_actions/topics-actions'
import { topicFormSchema } from '@/schemas/topic'

interface TopicFormDialogProps {
  mode: 'create' | 'edit'
  topic?: TopicItem
  children?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TopicFormDialog({
  mode,
  topic,
  children,
  open,
  onOpenChange,
}: TopicFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : internalOpen
  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  const isEditMode = mode === 'edit'

  const form = useForm<z.infer<typeof topicFormSchema>>({
    resolver: zodResolver(topicFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      introduce: '',
    },
  })

  useEffect(() => {
    if (isEditMode && topic) {
      form.reset({
        name: topic.name,
        slug: topic.slug,
        description: topic.description ?? '',
        introduce: topic.introduce ?? '',
      })
    } else {
      form.reset({
        name: '',
        slug: '',
        description: '',
        introduce: '',
      })
    }
  }, [dialogOpen, form, isEditMode, topic])

  const onSubmit = async (data: z.infer<typeof topicFormSchema>) => {
    setIsSubmitting(true)

    const url = isEditMode
      ? `${process.env.NEXT_PUBLIC_API_URL}/admin/topics/${topic?.id}`
      : `${process.env.NEXT_PUBLIC_API_URL}/admin/topics`
    const method = isEditMode ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })

    const result: ApiResponse<TopicItem> = await res.json()
    setIsSubmitting(false)

    if (result.status === 'success') {
      await updateTopics()
      toast.success(`專欄已成功${isEditMode ? '更新' : '建立'}`)
      handleOpenChange(false)
      if (!isEditMode) form.reset()
    } else {
      toast.error(result.message || `專欄${isEditMode ? '更新' : '建立'}失敗`)
    }
  }

  const title = isEditMode ? '編輯專欄' : '新增專欄'
  const description = isEditMode
    ? '修改以下資訊以更新專欄。'
    : '填寫以下資訊以建立一個新的專欄。'
  const submitButtonText = isEditMode ? '儲存變更' : '建立專欄'
  const submittingButtonText = isEditMode ? '更新中...' : '建立中...'

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger
          nativeButton={false}
          render={
            <>
              {isEditMode ? (
                children
              ) : (
                <Button>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  新增專欄
                </Button>
              )}
            </>
          }
        />
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup className="space-y-4">
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel>名稱</FieldLabel>
              <Input
                {...form.register('name')}
                placeholder="例如：生活隨筆"
                aria-invalid={!!form.formState.errors.name}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.slug}>
              <FieldLabel>網址別名 (Slug)</FieldLabel>
              <Input
                {...form.register('slug')}
                placeholder="例如：life-journal"
                aria-invalid={!!form.formState.errors.slug}
              />
              <FieldError errors={[form.formState.errors.slug]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.description}>
              <FieldLabel>描述</FieldLabel>
              <Textarea
                {...form.register('description')}
                placeholder="關於這個專欄的簡短描述..."
                aria-invalid={!!form.formState.errors.description}
              />
              <FieldError errors={[form.formState.errors.description]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.introduce}>
              <FieldLabel>介紹</FieldLabel>
              <Textarea
                {...form.register('introduce')}
                placeholder="關於這個專欄的詳細介紹..."
                aria-invalid={!!form.formState.errors.introduce}
              />
              <FieldError errors={[form.formState.errors.introduce]} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? submittingButtonText : submitButtonText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
