'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { InferClientOutputs } from '@orpc/client'
import { thinkingInputSchema } from '@sao-blog/api/schema/thinking'
import { Button } from '@sao-blog/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@sao-blog/ui/components/card'
import { Checkbox } from '@sao-blog/ui/components/checkbox'
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@sao-blog/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sao-blog/ui/components/select'
import { useIsMobile } from '@sao-blog/ui/hooks/use-mobile'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Loader2Icon,
  MessageCircleHeartIcon,
  NotebookIcon,
  SaveIcon,
  SendIcon,
  SettingsIcon,
} from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type z from 'zod'
import { MonacoEditor } from '@/components/monaco-editor'
import { client, orpc, queryClient } from '@/utils/orpc'

type RouterOutputs = InferClientOutputs<typeof client>
type ThinkingOutput = RouterOutputs['admin']['thinking']['getThinking']['data']
type ThinkingFormValues = z.infer<typeof thinkingInputSchema>

interface ThinkingEditorProps {
  thinkingId?: string
}

const emptyThinking: ThinkingFormValues = {
  content: '',
  status: true,
  noteId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const toValidDate = (value: unknown): Date => {
  if (value instanceof Date) return value
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

const mapThinkingToFormValues = (
  thinking: NonNullable<ThinkingOutput>
): ThinkingFormValues => ({
  content: thinking.content,
  status: thinking.status,
  noteId: thinking.noteId,
  createdAt: toValidDate(thinking.createdAt),
  updatedAt: toValidDate(thinking.updatedAt),
})

export function ThinkingEditor({ thinkingId }: ThinkingEditorProps) {
  const isEditMode = Boolean(thinkingId)
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  const { data: thinkingData } = useQuery({
    ...orpc.admin.thinking.getThinking.queryOptions({
      input: { id: thinkingId! },
    }),
    enabled: isEditMode,
  })

  const { data: notesData, status: notesStatus } = useQuery(
    orpc.admin.note.getNotes.queryOptions()
  )

  const form = useForm<ThinkingFormValues>({
    resolver: zodResolver(thinkingInputSchema),
    values:
      isEditMode && thinkingData?.status === 'success' && thinkingData.data
        ? mapThinkingToFormValues(thinkingData.data)
        : emptyThinking,
  })

  const createThinkingMutation = useMutation(
    orpc.admin.thinking.createThinking.mutationOptions()
  )
  const updateThinkingMutation = useMutation(
    orpc.admin.thinking.updateThinking.mutationOptions()
  )

  const isSubmitting =
    createThinkingMutation.isPending || updateThinkingMutation.isPending

  const handleSubmit =
    (type: 'draft' | 'publish') =>
    async (data: ThinkingFormValues) => {
      const payload: ThinkingFormValues = {
        ...data,
        status: type === 'publish',
        noteId: data.noteId?.trim() ? data.noteId.trim() : null,
        createdAt: data.createdAt ?? new Date(),
        updatedAt: new Date(),
      }

      try {
        if (isEditMode && thinkingId) {
          await updateThinkingMutation.mutateAsync({ id: thinkingId, ...payload })
          toast.success(type === 'publish' ? '想法已發表！' : '草稿已更新！')
        } else {
          await createThinkingMutation.mutateAsync(payload)
          toast.success(type === 'publish' ? '想法已發表！' : '草稿已建立！')
          navigate({ to: '/thinking' })
        }

        await queryClient.invalidateQueries({
          queryKey: orpc.admin.thinking.getThinkings.queryOptions().queryKey,
        })

        if (isEditMode && thinkingId) {
          await queryClient.invalidateQueries({
            queryKey: orpc.admin.thinking.getThinking.queryOptions({
              input: { id: thinkingId },
            }).queryKey,
          })
        }
      } catch (error) {
        console.error(error)
        toast.error(
          type === 'publish' ? '發表失敗，請稍後再試。' : '草稿操作失敗，請稍後再試。'
        )
      }
    }

  const handleValidationError = (formErrors: unknown) => {
    console.error('Validation errors:', formErrors)
    toast.error('表單驗證失敗，請確認想法內容。')
  }

  const submitHandler = (type: 'draft' | 'publish') =>
    form.handleSubmit(handleSubmit(type), handleValidationError)

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <MessageCircleHeartIcon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
              <h1 className="text-balance text-lg font-bold sm:text-xl">
                想法編輯器：{isEditMode ? '編輯想法' : '新增想法'}
              </h1>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={submitHandler('draft')}
                disabled={isSubmitting}
                className="gap-1 bg-transparent px-2 sm:gap-2 sm:px-3"
                type="button"
              >
                <SaveIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {isSubmitting ? '處理中...' : '存草稿'}
                </span>
              </Button>

              <Button
                size="sm"
                onClick={submitHandler('publish')}
                disabled={isSubmitting}
                className="gap-1 px-2 sm:gap-2 sm:px-3"
                type="button"
              >
                <SendIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {isSubmitting ? '發表中...' : '發表'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        <form id="thinking-form">
          <div className="grid grid-cols-1 gap-4 sm:gap-8 lg:grid-cols-4">
            <div className="order-1 space-y-4 sm:space-y-6 lg:col-span-3">
              <FieldGroup className="space-y-4 sm:space-y-6">
                <Controller
                  control={form.control}
                  name="content"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={!!fieldState.error}>
                      <FieldContent>
                        <div className="overflow-hidden rounded-lg">
                          <MonacoEditor
                            value={field.value}
                            onChange={(v) => field.onChange(v ?? '')}
                            language="markdown"
                            height={isMobile ? '360px' : '600px'}
                            onSave={submitHandler('draft')}
                          />
                        </div>
                      </FieldContent>
                      <FieldError
                        errors={fieldState.error ? [fieldState.error] : []}
                      />
                    </Field>
                  )}
                />
              </FieldGroup>
            </div>

            <div className="order-2 space-y-4 sm:space-y-6 lg:col-span-1">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <NotebookIcon className="h-4 w-4 text-primary" />
                    發表於日記
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <Controller
                    control={form.control}
                    name="noteId"
                    render={({ field, fieldState }) => {
                      const enabled = field.value !== null
                      return (
                        <div className="space-y-3">
                          <Field orientation="horizontal">
                            <Checkbox
                              checked={enabled}
                              onCheckedChange={(value) =>
                                field.onChange(value ? '' : null)
                              }
                            />
                            <FieldContent>
                              <FieldLabel className="text-sm">
                                關聯到一篇日記
                              </FieldLabel>
                              <p className="text-xs text-muted-foreground">
                                開啟後可在 /notes/xxx 旁顯示此想法
                              </p>
                            </FieldContent>
                          </Field>

                          {enabled && (
                            <Field data-invalid={!!fieldState.error}>
                              <Select
                                value={field.value ? field.value : ''}
                                onValueChange={(value) =>
                                  field.onChange((value as string) || '')
                                }
                                disabled={notesStatus === 'pending'}
                              >
                                <SelectTrigger aria-invalid={!!fieldState.error}>
                                  {notesStatus === 'pending' ? (
                                    <Loader2Icon className="animate-spin text-muted-foreground" />
                                  ) : (
                                    <SelectValue placeholder="選擇日記" />
                                  )}
                                </SelectTrigger>
                                <SelectContent alignItemWithTrigger={false}>
                                  {notesData?.data.map((note) => (
                                    <SelectItem key={note.id} value={note.id}>
                                      {note.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FieldError
                                errors={fieldState.error ? [fieldState.error] : []}
                              />
                            </Field>
                          )}
                        </div>
                      )
                    }}
                  />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <SettingsIcon className="h-4 w-4 text-primary" />
                    發表設定
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 sm:space-y-4">
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Field orientation="horizontal">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(value) =>
                            field.onChange(Boolean(value))
                          }
                        />
                        <FieldContent>
                          <FieldLabel className="text-sm">公開發表</FieldLabel>
                          <p className="text-xs text-muted-foreground">
                            未勾選時將維持私密草稿
                          </p>
                        </FieldContent>
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}
