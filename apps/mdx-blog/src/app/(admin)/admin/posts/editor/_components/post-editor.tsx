'use client'

import { DevTool } from '@hookform/devtools'
import { postSchema } from '@/schemas/post'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import type z from 'zod'
import MultipleSelector from '@/components/ui/multiple-selector'
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
  ImageIcon,
  Save,
  Send,
  Eye,
  Clock,
  Folder,
  Loader2Icon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { postsUpdate } from '../../_actions/posts-actions'
import { useIsMobile } from '@/hooks/use-mobile'
import { useQuery } from '@tanstack/react-query'
import { ApiResponse } from '@/types/api'
import { CategoryItem } from '@/types/category'
import { PostItem } from '@/types/post'
import { TagItem } from '@/types/tag'

const PostEditor = ({ postData }: { postData?: PostItem }) => {
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const isMobile = useIsMobile()

  const { status: categoriesStatus, data: categoriesData } = useQuery<
    ApiResponse<CategoryItem[]>
  >({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/categories`,
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

  const { status: tagsStatus, data: tagsData } = useQuery<
    ApiResponse<TagItem[]>
  >({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tags`, {
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error('Network response was not ok')
      }
      return res.json()
    },
  })

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      slug: '',
      title: '',
      content: '',
      summary: '',
      category: '',
      tags: [],
      cover: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      allowComments: true,
      pin: false,
      pinOrder: 0,
      status: 'draft',
    },
  })

  // useWatch to subscribe to pin changes so component re-renders when checkbox toggles
  // ensure a boolean defaultValue so undefined doesn't block rendering
  const isPinned = useWatch({
    control: form.control,
    name: 'pin',
    defaultValue: false,
  })
  const errors = form.formState.errors

  useEffect(() => {
    if (!postData) return
    if (categoriesStatus !== 'success') return
    form.reset({
      slug: postData.slug ?? '',
      title: postData.title ?? '',
      // PostItem (list) doesn't include content — keep empty or fetch separately
      content: postData.content ?? '',
      summary: postData.summary ?? '',
      category: postData.category.id ?? '',
      // tags are not part of PostItem list type, default to empty array
      tags: postData.tags
        ? postData.tags.map((tag) => ({ label: tag.name, value: tag.id }))
        : [],
      cover: postData.cover ?? '',
      createdAt: postData.createdAt ?? new Date().toISOString(),
      updatedAt: postData.updatedAt ?? new Date().toISOString(),
      allowComments:
        typeof postData.allowComments === 'boolean'
          ? postData.allowComments
          : true,
      pin: typeof postData.pin === 'boolean' ? postData.pin : false,
      pinOrder: typeof postData.pinOrder === 'number' ? postData.pinOrder : 0,
      status: postData.status ?? 'draft',
    })
  }, [postData, form, categoriesStatus])

  function onSaveDraft(data: z.infer<typeof postSchema>) {
    setIsSavingDraft(true)
    const draftData = { ...data, status: 'draft' }
    console.log('Saving draft:', draftData)
    toast.success('草稿已儲存', {
      description: '您的文章已儲存為草稿，可以稍後繼續編輯。',
    })
    setIsSavingDraft(false)
  }

  async function onPublish(data: z.infer<typeof postSchema>) {
    setIsPublishing(true)
    const publishData = { ...data, status: 'published' }
    console.log('Publishing post:', publishData)
    // publishData tags 要先轉成 string[] 並把 category 轉為 API 所需的 categoryId
    const { category, tags, ...rest } = publishData
    const updateData = {
      ...rest,
      // API expects `categoryId` (see openapi), not `category`
      categoryId: category || null,
      tags: tags.map((tag) => tag.value),
    }
    console.log('Transformed publish data:', updateData)

    let res
    if (postData?.id) {
      // update existing post
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/posts/${postData.id}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        }
      )
    } else {
      // create new post
      res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/posts/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })
    }
    if (!res.ok) {
      toast.error('發佈文章失敗，請稍後再試。')
      setIsPublishing(false)
      return
    }
    await postsUpdate()
    toast.success('文章已發佈', {
      description: '您的文章已成功發佈，讀者現在可以看到它了。',
    })
    setIsPublishing(false)
  }

  function onArchive(data: z.infer<typeof postSchema>) {
    const archiveData = { ...data, status: 'archived' }
    console.log('Archiving post:', archiveData)
    toast.success('文章已封存', {
      description: '文章已移至封存區，不會在前台顯示。',
    })
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h1 className="text-lg sm:text-xl font-bold text-balance">
                文章編輯器
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
                onClick={form.handleSubmit(onSaveDraft, (errors) => {
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
          id="post-form"
          onSubmit={form.handleSubmit(
            (data) => {
              if (data.status === 'published') {
                onPublish(data)
              } else {
                onSaveDraft(data)
              }
            },
            (submitErrors) => {
              console.log('validation errors:', submitErrors)
              toast.error('表單驗證失敗，請檢查必填欄位並修正。')
            }
          )}
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-4 sm:space-y-6 order-1">
              <FieldGroup className="space-y-4 sm:space-y-6">
                <Field data-invalid={!!errors.title}>
                  <Input
                    {...form.register('title')}
                    placeholder="輸入文章標題..."
                    aria-invalid={!!errors.title}
                  />
                  <FieldError errors={[errors.title]} />
                </Field>

                <Field data-invalid={!!errors.summary}>
                  <Input
                    {...form.register('summary')}
                    placeholder="簡短描述文章內容..."
                    aria-invalid={!!errors.summary}
                  />
                  <FieldError errors={[errors.summary]} />
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
                            onSave={() => form.handleSubmit(onSaveDraft)()}
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
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Folder className="h-4 w-4 text-primary" />
                    分類與標籤
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <Controller
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <Field data-invalid={!!errors.category}>
                        <FieldLabel className="text-xs text-muted-foreground">
                          分類
                        </FieldLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            {categoriesData ? (
                              <SelectValue placeholder="選擇分類" />
                            ) : (
                              <Loader2Icon className="animate-spin text-muted-foreground" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {categoriesData?.data.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError errors={[errors.category]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <Field data-invalid={!!errors.tags}>
                        <FieldLabel className="text-xs text-muted-foreground">
                          標籤
                        </FieldLabel>
                        <MultipleSelector
                          {...field}
                          options={
                            tagsData
                              ? tagsData.data.map((tag) => ({
                                  label: tag.name,
                                  value: tag.id,
                                }))
                              : []
                          }
                          placeholder="選擇標籤..."
                          emptyIndicator={
                            <p className="text-center text-sm leading-10 text-muted-foreground">
                              {tagsStatus === 'pending' ? (
                                <Loader2Icon className="animate-spin text-muted-foreground mx-auto" />
                              ) : (
                                '沒有找到相關標籤'
                              )}
                            </p>
                          }
                        />
                        <FieldError errors={[errors.tags]} />
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {/* Publishing Options */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4 text-primary" />
                      發佈設定
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3 sm:space-y-4">
                    <Controller
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <Field data-invalid={!!errors.status}>
                          <FieldLabel className="text-xs text-muted-foreground">
                            狀態
                          </FieldLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value)
                              if (value === 'archived') {
                                form.handleSubmit(onArchive)()
                              }
                            }}
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="選擇狀態" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">草稿</SelectItem>
                              <SelectItem value="published">已發佈</SelectItem>
                              <SelectItem value="archived">已封存</SelectItem>
                            </SelectContent>
                          </Select>
                          <FieldError errors={[errors.status]} />
                        </Field>
                      )}
                    />

                    <Field data-invalid={!!errors.slug}>
                      <FieldLabel className="text-xs text-muted-foreground">
                        網址
                      </FieldLabel>
                      <Input
                        {...form.register('slug')}
                        placeholder="article-url-slug"
                        className="text-sm"
                        aria-invalid={!!errors.slug}
                      />
                      <FieldError errors={[errors.slug]} />
                    </Field>
                  </CardContent>
                </Card>

                {/* Cover Image */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      封面圖片
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Field data-invalid={!!errors.cover}>
                      <Input
                        {...form.register('cover')}
                        placeholder="圖片 URL"
                        className="text-sm"
                        aria-invalid={!!errors.cover}
                      />
                      <FieldError errors={[errors.cover]} />
                    </Field>
                  </CardContent>
                </Card>
              </div>

              {/* Article Settings */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Settings className="h-4 w-4 text-primary" />
                    文章設定
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3 sm:space-y-4">
                  <Controller
                    control={form.control}
                    name="allowComments"
                    render={({ field }) => (
                      <Field orientation="horizontal">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(v) => field.onChange(Boolean(v))}
                        />
                        <FieldContent>
                          <FieldLabel className="text-sm">允許留言</FieldLabel>
                          <p className="text-xs text-muted-foreground">
                            讀者可以在文章下方留言
                          </p>
                        </FieldContent>
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="pin"
                    render={({ field }) => (
                      <Field orientation="horizontal">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(v) => field.onChange(Boolean(v))}
                        />
                        <FieldContent>
                          <FieldLabel className="text-sm">置頂文章</FieldLabel>
                          <p className="text-xs text-muted-foreground">
                            固定在列表頂部
                          </p>
                        </FieldContent>
                      </Field>
                    )}
                  />

                  {isPinned && (
                    <Controller
                      control={form.control}
                      name="pinOrder"
                      render={({ field }) => (
                        <Field data-invalid={!!errors.pinOrder}>
                          <FieldLabel className="text-xs text-muted-foreground">
                            置頂順序
                          </FieldLabel>
                          <Input
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              const num = val === '' ? undefined : Number(val)
                              field.onChange(num)
                            }}
                            type="number"
                            min={0}
                            placeholder="0"
                            className="text-sm"
                            aria-invalid={!!errors.pinOrder}
                          />
                          <FieldError errors={[errors.pinOrder]} />
                        </Field>
                      )}
                    />
                  )}
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

export default PostEditor
