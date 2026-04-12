'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { InferClientOutputs } from '@orpc/client'
import { noteInputSchema } from '@sao-blog/api/schema/note'
import { Button } from '@sao-blog/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@sao-blog/ui/components/card'
import { Checkbox } from '@sao-blog/ui/components/checkbox'
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@sao-blog/ui/components/field'
import { Input } from '@sao-blog/ui/components/input'
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
  BookIcon,
  CloudIcon,
  EyeIcon,
  FileTextIcon,
  HeartIcon,
  Loader2Icon,
  SaveIcon,
  SendIcon,
  SettingsIcon,
} from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type z from 'zod'
import { moodOptions, weatherOptions } from '@/config/note'
import { MonacoEditor } from '@/components/monaco-editor'
import { client, orpc, queryClient } from '@/utils/orpc'

type RouterOutputs = InferClientOutputs<typeof client>
type NoteOutput = RouterOutputs['admin']['note']['getNote']['data']
type NoteFormValues = z.infer<typeof noteInputSchema>

interface NoteEditorProps {
  noteId?: string
}

const emptyNote: NoteFormValues = {
  title: '',
  mood: '',
  weather: '',
  bookmark: false,
  coordinates: null,
  location: null,
  status: false,
  content: '',
  topicId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const toValidDate = (value: unknown): Date => {
  if (value instanceof Date) return value
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

const mapNoteToFormValues = (note: NonNullable<NoteOutput>): NoteFormValues => ({
  title: note.title,
  mood: note.mood,
  weather: note.weather,
  bookmark: note.bookmark,
  coordinates: note.coordinates,
  location: note.location,
  status: note.status,
  content: note.content,
  topicId: note.topicId,
  createdAt: toValidDate(note.createdAt),
  updatedAt: toValidDate(note.updatedAt),
})

export function NoteEditor({ noteId }: NoteEditorProps) {
  const isEditMode = Boolean(noteId)
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  const { data: noteData } = useQuery({
    ...orpc.admin.note.getNote.queryOptions({ input: { id: noteId! } }),
    enabled: isEditMode,
  })

  const { data: topicsData, status: topicsStatus } = useQuery(
    orpc.admin.topic.getTopics.queryOptions()
  )

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteInputSchema),
    values:
      isEditMode && noteData?.status === 'success' && noteData.data
        ? mapNoteToFormValues(noteData.data)
        : emptyNote,
  })

  const {
    formState: { errors },
  } = form

  const createNoteMutation = useMutation(
    orpc.admin.note.createNote.mutationOptions()
  )
  const updateNoteMutation = useMutation(
    orpc.admin.note.updateNote.mutationOptions()
  )

  const isSubmitting =
    createNoteMutation.isPending || updateNoteMutation.isPending

  const handleSubmit =
    (type: 'draft' | 'publish') =>
    async (data: NoteFormValues) => {
      const payload: NoteFormValues = {
        ...data,
        status: type === 'publish',
        coordinates: data.coordinates?.trim() ? data.coordinates.trim() : null,
        location: data.location?.trim() ? data.location.trim() : null,
        topicId: data.topicId?.trim() ? data.topicId.trim() : null,
        createdAt: data.createdAt ?? new Date(),
        updatedAt: new Date(),
      }

      try {
        if (isEditMode && noteId) {
          await updateNoteMutation.mutateAsync({ id: noteId, ...payload })
          toast.success(type === 'publish' ? '日記發佈成功！' : '草稿更新成功！')
        } else {
          await createNoteMutation.mutateAsync(payload)
          toast.success(type === 'publish' ? '日記發佈成功！' : '草稿建立成功！')
          navigate({ to: '/notes' })
        }

        await queryClient.invalidateQueries({
          queryKey: orpc.admin.note.getNotes.queryOptions().queryKey,
        })

        if (isEditMode && noteId) {
          await queryClient.invalidateQueries({
            queryKey: orpc.admin.note.getNote.queryOptions({
              input: { id: noteId },
            }).queryKey,
          })
        }
      } catch (error) {
        console.error(error)
        toast.error(type === 'publish' ? '發佈失敗，請稍後再試。' : '草稿操作失敗，請稍後再試。')
      }
    }

  const handleValidationError = (formErrors: unknown) => {
    console.error('Validation errors:', formErrors)
    toast.error('表單驗證失敗，請檢查必填欄位並修正。')
  }

  const submitHandler = (type: 'draft' | 'publish') =>
    form.handleSubmit(handleSubmit(type), handleValidationError)

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <FileTextIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h1 className="text-lg sm:text-xl font-bold text-balance">
                日記編輯器: {isEditMode ? '編輯日記' : '新增日記'}
              </h1>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 sm:gap-2 bg-transparent px-2 sm:px-3"
                type="button"
              >
                <EyeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">預覽</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={submitHandler('draft')}
                disabled={isSubmitting}
                className="gap-1 sm:gap-2 bg-transparent px-2 sm:px-3"
                type="button"
              >
                <SaveIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {isSubmitting ? '處理中...' : '草稿'}
                </span>
              </Button>

              <Button
                size="sm"
                onClick={submitHandler('publish')}
                disabled={isSubmitting}
                className="gap-1 sm:gap-2 px-2 sm:px-3"
                type="button"
              >
                <SendIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {isSubmitting ? '發佈中...' : '發佈'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <form id="note-form">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
            <div className="lg:col-span-3 space-y-4 sm:space-y-6 order-1">
              <FieldGroup className="space-y-4 sm:space-y-6">
                <Field data-invalid={!!errors.title}>
                  <Input
                    {...form.register('title')}
                    placeholder="輸入日記標題..."
                    aria-invalid={!!errors.title}
                  />
                  <FieldError errors={errors.title ? [errors.title] : []} />
                </Field>

                <Controller
                  control={form.control}
                  name="content"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={!!fieldState.error}>
                      <FieldContent>
                        <div className="rounded-lg overflow-hidden">
                          <MonacoEditor
                            value={field.value}
                            onChange={(v) => field.onChange(v ?? '')}
                            language="markdown"
                            height={isMobile ? '400px' : '700px'}
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

            <div className="lg:col-span-1 space-y-4 sm:space-y-6 order-2">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <HeartIcon className="h-4 w-4 text-primary" />
                    心情與天氣
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <Controller
                    control={form.control}
                    name="mood"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={!!fieldState.error}>
                        <FieldLabel className="text-xs text-muted-foreground">
                          心情
                        </FieldLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger aria-invalid={!!fieldState.error}>
                            <SelectValue placeholder="選擇心情" />
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false}>
                            {moodOptions.map((mood) => (
                              <SelectItem key={mood.value} value={mood.value}>
                                {mood.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError
                          errors={fieldState.error ? [fieldState.error] : []}
                        />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="weather"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={!!fieldState.error}>
                        <FieldLabel className="text-xs text-muted-foreground">
                          天氣
                        </FieldLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger aria-invalid={!!fieldState.error}>
                            <SelectValue placeholder="選擇天氣" />
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false}>
                            {weatherOptions.map((weather) => (
                              <SelectItem key={weather.value} value={weather.value}>
                                {weather.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError
                          errors={fieldState.error ? [fieldState.error] : []}
                        />
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <CloudIcon className="h-4 w-4 text-primary" />
                    位置資訊
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <Controller
                    control={form.control}
                    name="location"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={!!fieldState.error}>
                        <FieldLabel className="text-xs text-muted-foreground">
                          位置描述
                        </FieldLabel>
                        <Input
                          value={field.value ?? ''}
                          onChange={(event) => {
                            field.onChange(event.target.value)
                          }}
                          placeholder="例如：台北市信義區"
                          className="text-sm"
                          aria-invalid={!!fieldState.error}
                        />
                        <FieldError
                          errors={fieldState.error ? [fieldState.error] : []}
                        />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="coordinates"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={!!fieldState.error}>
                        <FieldLabel className="text-xs text-muted-foreground">
                          座標
                        </FieldLabel>
                        <Input
                          value={field.value ?? ''}
                          onChange={(event) => {
                            field.onChange(event.target.value)
                          }}
                          placeholder="例如：25.033,121.565"
                          className="text-sm"
                          aria-invalid={!!fieldState.error}
                        />
                        <FieldError
                          errors={fieldState.error ? [fieldState.error] : []}
                        />
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <BookIcon className="h-4 w-4 text-primary" />
                    專欄設定
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <Controller
                    control={form.control}
                    name="topicId"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={!!fieldState.error}>
                        <FieldLabel className="text-xs text-muted-foreground">
                          選擇專欄
                        </FieldLabel>
                        <Select
                          items={
                            topicsData?.data.map((topic) => ({
                              label: topic.name,
                              value: topic.id,
                            })) ?? []
                          }
                          value={field.value ?? 'none'}
                          onValueChange={(value) =>
                            field.onChange(value === 'none' ? null : value)
                          }
                          disabled={topicsStatus === 'pending'}
                        >
                          <SelectTrigger aria-invalid={!!fieldState.error}>
                            {topicsStatus === 'pending' ? (
                              <Loader2Icon className="animate-spin text-muted-foreground" />
                            ) : (
                              <SelectValue placeholder="選擇專欄（可選）" />
                            )}
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false}>
                            <SelectItem value="none">不分類</SelectItem>
                            {topicsData?.data.map((topic) => (
                              <SelectItem key={topic.id} value={topic.id}>
                                {topic.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError
                          errors={fieldState.error ? [fieldState.error] : []}
                        />
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <SettingsIcon className="h-4 w-4 text-primary" />
                    日記設定
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3 sm:space-y-4">
                  <Controller
                    control={form.control}
                    name="bookmark"
                    render={({ field }) => (
                      <Field orientation="horizontal">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(value) => field.onChange(Boolean(value))}
                        />
                        <FieldContent>
                          <FieldLabel className="text-sm">收藏日記</FieldLabel>
                          <p className="text-xs text-muted-foreground">
                            標記為重要日記
                          </p>
                        </FieldContent>
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Field orientation="horizontal">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(value) => field.onChange(Boolean(value))}
                        />
                        <FieldContent>
                          <FieldLabel className="text-sm">已發佈</FieldLabel>
                          <p className="text-xs text-muted-foreground">
                            未勾選時將維持草稿狀態
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