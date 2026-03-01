'use client'

import { DevTool } from '@hookform/devtools'
import { noteSchema } from '@/schemas/note'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import type z from 'zod'
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MonacoEditor } from '@/components/monaco-editor'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  FileText,
  Settings,
  Save,
  Send,
  Eye,
  Clock,
  Heart,
  Cloud,
  Book,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  createNote,
  updateNote,
  notesUpdate,
} from '../../_actions/notes-actions'
import { useIsMobile } from '@/hooks/use-mobile'
import { Note, NoteItem } from '@/types/note'
import { TopicItem } from '@/types/topic'
import { ApiResponse } from '@/types/api'

const moodOptions = [
  { value: 'happy', label: '開心' },
  { value: 'sad', label: '難過' },
  { value: 'angry', label: '生氣' },
  { value: 'excited', label: '興奮' },
  { value: 'calm', label: '平靜' },
  { value: 'anxious', label: '焦慮' },
]

const weatherOptions = [
  { value: 'sunny', label: '晴天' },
  { value: 'cloudy', label: '多雲' },
  { value: 'rainy', label: '下雨' },
  { value: 'snowy', label: '下雪' },
  { value: 'windy', label: '有風' },
  { value: 'stormy', label: '暴風雨' },
]

const NoteEditor = ({ noteData }: { noteData?: NoteItem }) => {
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const isMobile = useIsMobile()

  const { data: topicsData, isLoading: isLoadingTopics } = useQuery<
    ApiResponse<TopicItem[]>
  >({
    queryKey: ['topics'],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/topics?limit=100`,
        {
          credentials: 'include',
        }
      )
      if (!res.ok) {
        throw new Error('Network response was not ok')
      }
      return res.json()
    },
  })

  const form = useForm<z.infer<typeof noteSchema>>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: '',
      content: '',
      mood: '',
      weather: '',
      bookmark: false,
      status: true,
      coordinates: '',
      location: '',
      topicId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  })
  const errors = form.formState.errors

  useEffect(() => {
    if (!noteData) return
    form.reset({
      title: noteData.title ?? '',
      content: noteData.content ?? '',
      mood: noteData.mood ?? '',
      weather: noteData.weather ?? '',
      bookmark:
        typeof noteData.bookmark === 'boolean' ? noteData.bookmark : false,
      status: typeof noteData.status === 'boolean' ? noteData.status : true,
      coordinates: noteData.coordinates ?? '',
      location: noteData.location ?? '',
      topicId: noteData.topic?.id ?? null,
      createdAt: noteData.createdAt ?? new Date().toISOString(),
      updatedAt: noteData.updatedAt ?? new Date().toISOString(),
    })
  }, [noteData, form])

  async function onSave(data: z.infer<typeof noteSchema>) {
    setIsSavingDraft(true)
    console.log('Saving note:', data)

    try {
      let result
      if (noteData?.id) {
        // 更新現有日記
        result = await updateNote(noteData.id, data)
      } else {
        // 建立新日記
        result = await createNote(data)
      }

      if (result.success) {
        toast.success('日記已儲存', {
          description: '您的日記已儲存成功。',
        })
      } else {
        toast.error(result.error || '儲存失敗，請稍後再試')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('儲存失敗，請稍後再試')
    } finally {
      setIsSavingDraft(false)
    }
  }

  async function onPublish(data: z.infer<typeof noteSchema>) {
    setIsPublishing(true)
    const publishData = { ...data, status: true }
    console.log('Publishing note:', publishData)

    try {
      let result
      if (noteData?.id) {
        // 更新現有日記
        result = await updateNote(noteData.id, publishData)
      } else {
        // 建立新日記
        result = await createNote(publishData)
      }

      if (result.success) {
        toast.success('日記已發佈', {
          description: '您的日記已成功發佈。',
        })
      } else {
        toast.error(result.error || '發佈失敗，請稍後再試')
      }
    } catch (error) {
      console.error('Publish error:', error)
      toast.error('發佈失敗，請稍後再試')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h1 className="text-lg sm:text-xl font-bold text-balance">
                日記編輯器
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 sm:gap-2 bg-transparent px-2 sm:px-3"
              >
                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">預覽</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={form.handleSubmit(onSave, (errors) => {
                  console.log('validation errors:', errors)
                  toast.error('表單驗證失敗，請檢查必填欄位並修正。')
                })}
                disabled={isSavingDraft || isPublishing}
                className="gap-1 sm:gap-2 bg-transparent px-2 sm:px-3"
              >
                <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {isSavingDraft ? '儲存中...' : '儲存'}
                </span>
              </Button>
              <Button
                size="sm"
                onClick={form.handleSubmit(onPublish, (errors) => {
                  console.log('validation errors:', errors)
                  toast.error('表單驗證失敗，請檢查必填欄位並修正。')
                })}
                disabled={isSavingDraft || isPublishing}
                className="gap-1 sm:gap-2 px-2 sm:px-3"
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {isPublishing ? '發佈中...' : '發佈'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <form
          id="note-form"
          onSubmit={form.handleSubmit(onSave, (submitErrors) => {
            console.log('validation errors:', submitErrors)
            toast.error('表單驗證失敗，請檢查必填欄位並修正。')
          })}
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-4 sm:space-y-6 order-1">
              <FieldGroup className="space-y-4 sm:space-y-6">
                <Field data-invalid={!!errors.title}>
                  <Input
                    {...form.register('title')}
                    placeholder="輸入日記標題..."
                    aria-invalid={!!errors.title}
                  />
                  <FieldError errors={[errors.title]} />
                </Field>

                <Controller
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <Field data-invalid={!!errors.content}>
                      <FieldContent>
                        <div className="rounded-lg overflow-hidden">
                          <MonacoEditor
                            value={field.value}
                            onChange={(v) => field.onChange(v ?? '')}
                            language="markdown"
                            height={isMobile ? '400px' : '700px'}
                            onSave={() => form.handleSubmit(onSave)()}
                          />
                        </div>
                      </FieldContent>
                      <FieldError errors={[errors.content]} />
                    </Field>
                  )}
                />
              </FieldGroup>
            </div>

            <div className="lg:col-span-1 space-y-4 sm:space-y-6 order-2">
              {/* Mood & Weather */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Heart className="h-4 w-4 text-primary" />
                    心情與天氣
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <Controller
                    control={form.control}
                    name="mood"
                    render={({ field }) => (
                      <Field data-invalid={!!errors.mood}>
                        <FieldLabel className="text-xs text-muted-foreground">
                          心情
                        </FieldLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="選擇心情" />
                          </SelectTrigger>
                          <SelectContent>
                            {moodOptions.map((mood) => (
                              <SelectItem key={mood.value} value={mood.value}>
                                {mood.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError errors={[errors.mood]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="weather"
                    render={({ field }) => (
                      <Field data-invalid={!!errors.weather}>
                        <FieldLabel className="text-xs text-muted-foreground">
                          天氣
                        </FieldLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="選擇天氣" />
                          </SelectTrigger>
                          <SelectContent>
                            {weatherOptions.map((weather) => (
                              <SelectItem key={weather.value} value={weather.value}>
                                {weather.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError errors={[errors.weather]} />
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Location */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Cloud className="h-4 w-4 text-primary" />
                    位置資訊
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <Field data-invalid={!!errors.location}>
                    <FieldLabel className="text-xs text-muted-foreground">
                      位置描述
                    </FieldLabel>
                    <Input
                      {...form.register('location')}
                      placeholder="例如：台北市信義區"
                      className="text-sm"
                      aria-invalid={!!errors.location}
                    />
                    <FieldError errors={[errors.location]} />
                  </Field>

                  <Field data-invalid={!!errors.coordinates}>
                    <FieldLabel className="text-xs text-muted-foreground">
                      座標
                    </FieldLabel>
                    <Input
                      {...form.register('coordinates')}
                      placeholder="例如：25.033,121.565"
                      className="text-sm"
                      aria-invalid={!!errors.coordinates}
                    />
                    <FieldError errors={[errors.coordinates]} />
                  </Field>
                </CardContent>
              </Card>

              {/* Settings */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Settings className="h-4 w-4 text-primary" />
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
                          onCheckedChange={(v) => field.onChange(Boolean(v))}
                        />
                        <FieldContent>
                          <FieldLabel className="text-sm">收藏日記</FieldLabel>
                          <p className="text-xs text-muted-foreground">
                            標記為重要的日記
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
                          onCheckedChange={(v) => field.onChange(Boolean(v))}
                        />
                        <FieldContent>
                          <FieldLabel className="text-sm">啟用狀態</FieldLabel>
                          <p className="text-xs text-muted-foreground">
                            是否在前台顯示
                          </p>
                        </FieldContent>
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Topic */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Book className="h-4 w-4 text-primary" />
                    專欄設定
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <Controller
                    control={form.control}
                    name="topicId"
                    render={({ field }) => (
                      <Field data-invalid={!!errors.topicId}>
                        <FieldLabel className="text-xs text-muted-foreground">
                          選擇專欄
                        </FieldLabel>
                        <Select
                          value={field.value ?? 'none'}
                          onValueChange={(value) =>
                            field.onChange(value === 'none' ? null : value)
                          }
                          disabled={isLoadingTopics}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="選擇專欄..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">不分類</SelectItem>
                            {topicsData?.data?.map((topic) => (
                              <SelectItem key={topic.id} value={topic.id}>
                                {topic.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError errors={[errors.topicId]} />
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
        {/* <DevTool control={form.control} /> */}
      </div>
    </>
  )
}

export default NoteEditor
