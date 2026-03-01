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
import { TagItem } from '@/types/tag'
import { updateTags } from '../../_actions/tags-actions'
import { tagFormSchema } from '@/schemas/tag'

interface TagFormDialogProps {
  mode: 'create' | 'edit'
  tag?: TagItem
  children?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TagFormDialog({
  mode,
  tag,
  children,
  open,
  onOpenChange,
}: TagFormDialogProps) {
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

  const form = useForm<z.infer<typeof tagFormSchema>>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      color: '#000000',
    },
  })

  useEffect(() => {
    if (isEditMode && tag) {
      form.reset({
        name: tag.name,
        slug: tag.slug,
        description: tag.description ?? '',
        color: tag.color ?? '#000000',
      })
    } else {
      form.reset({
        name: '',
        slug: '',
        description: '',
        color: '#000000',
      })
    }
  }, [dialogOpen, form, isEditMode, tag])

  const onSubmit = async (data: z.infer<typeof tagFormSchema>) => {
    setIsSubmitting(true)

    const url = isEditMode
      ? `${process.env.NEXT_PUBLIC_API_URL}/admin/tags/${tag?.id}`
      : `${process.env.NEXT_PUBLIC_API_URL}/admin/tags`
    const method = isEditMode ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })

    const result: ApiResponse<TagItem> = await res.json()
    setIsSubmitting(false)

    if (result.status === 'success') {
      await updateTags()
      toast.success(`標籤已成功${isEditMode ? '更新' : '建立'}`)
      handleOpenChange(false)
      if (!isEditMode) form.reset()
    } else {
      toast.error(result.message || `標籤${isEditMode ? '更新' : '建立'}失敗`)
    }
  }

  const title = isEditMode ? '編輯標籤' : '新增標籤'
  const description = isEditMode
    ? '修改以下資訊以更新標籤。'
    : '填寫以下資訊以建立一個新的標籤。'
  const submitButtonText = isEditMode ? '儲存變更' : '建立標籤'
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
                  新增標籤
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
                placeholder="例如：Next.js"
                aria-invalid={!!form.formState.errors.name}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.slug}>
              <FieldLabel>網址別名 (Slug)</FieldLabel>
              <Input
                {...form.register('slug')}
                placeholder="例如：next-js"
                aria-invalid={!!form.formState.errors.slug}
              />
              <FieldError errors={[form.formState.errors.slug]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.description}>
              <FieldLabel>描述</FieldLabel>
              <Textarea
                {...form.register('description')}
                placeholder="關於這個標籤的簡短描述..."
                aria-invalid={!!form.formState.errors.description}
              />
              <FieldError errors={[form.formState.errors.description]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.color}>
              <FieldLabel>顏色</FieldLabel>
              <Input
                {...form.register('color')}
                type="color"
                aria-invalid={!!form.formState.errors.color}
              />
              <FieldError errors={[form.formState.errors.color]} />
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
