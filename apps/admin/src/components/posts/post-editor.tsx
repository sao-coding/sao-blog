'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { orpc } from '@/utils/orpc'
import {
  ClockIcon,
  EyeIcon,
  FileTextIcon,
  FolderIcon,
  ImageIcon,
  Loader2Icon,
  SaveIcon,
  SendIcon,
  SettingsIcon,
} from 'lucide-react'
import { Button } from '@sao-blog/ui/components/button'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@sao-blog/ui/components/card'
import {
  Field,
  FieldGroup,
  FieldError,
  FieldLabel,
  FieldContent,
} from '@sao-blog/ui/components/field'
import { Input } from '@sao-blog/ui/components/input'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { MonacoEditor } from '@/components/monaco-editor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sao-blog/ui/components/select'
import { Checkbox } from '@sao-blog/ui/components/checkbox'
import MultipleSelector from '@sao-blog/ui/components/multiple-selector'
import { zodResolver } from '@hookform/resolvers/zod'
import type z from 'zod'
import { postInputSchema } from '@sao-blog/api/schema/post'
import { useIsMobile } from '@sao-blog/ui/hooks/use-mobile'
import { useNavigate } from '@tanstack/react-router'

type PostFormValues = z.infer<typeof postInputSchema>

interface PostEditorProps {
  postId?: string
}

const emptyPost: PostFormValues = {
  id: '',
  title: '',
  summary: '',
  content: '',
  slug: '',
  cover: '',
  status: 'draft',
  allowComments: true,
  pin: false,
  pinOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: {
    id: '',
  },
  tags: [],
  // author: {
  //   id: '',
  //   username: null,
  //   displayUsername: null,
  //   name: null,
  //   email: '',
  //   emailVerified: false,
  //   image: null,
  //   role: null,
  //   banned: null,
  //   banReason: null,
  //   banExpires: null,
  //   createdAt: new Date(),
  //   updatedAt: new Date(),
  // },
}

const POST_STATUS_LIST = [
  { label: '草稿', value: 'draft' },
  { label: '已發佈', value: 'published' },
  { label: '已封存', value: 'archived' },
] as const

export function PostEditor({ postId }: PostEditorProps) {
  const isEditMode = Boolean(postId)
  console.log('PostEditor rendered with postId:', postId, 'isEditMode:', isEditMode)
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  const { data: postData } = useQuery({
    ...orpc.admin.post.getPost.queryOptions({ input: { id: postId! } }),
    enabled: isEditMode,
  })

  const { data: categoriesData } = useQuery(
    orpc.admin.category.getCategories.queryOptions()
  )

  const { data: tagsData, status: tagsStatus } = useQuery(
    orpc.admin.tag.getTags.queryOptions()
  )

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postInputSchema),
    values:
      isEditMode && postData?.status === 'success'
        ? postData.data
        : emptyPost,
  })

  // ★ 取出 errors 物件
  const { formState: { errors } } = form

  const isPinned = useWatch({
    control: form.control,
    name: 'pin',
    defaultValue: false,
  })

  const createPostMutation = useMutation(orpc.admin.post.createPost.mutationOptions())
  const updatePostMutation = useMutation(orpc.admin.post.updatePost.mutationOptions())

  const isSaving =
    createPostMutation.isPending || updatePostMutation.isPending

  const handleSubmit =
    (type: 'draft' | 'publish' | 'archive') =>
    async (data: PostFormValues) => {
      if (type === 'publish') data.status = 'published'
      if (type === 'archive') data.status = 'archived'
      console.log('Submitting form with data:', data)  // ← 加這行
      try {
        if (isEditMode) {
          await updatePostMutation.mutateAsync(data)
          toast.success('文章更新成功！')
        } else {
          await createPostMutation.mutateAsync(data)
          toast.success('文章建立成功！')
          navigate({ to: '/posts' })
        }
      } catch (err) {
        console.error(err)
        toast.error(isEditMode ? '更新文章時發生錯誤，請稍後再試。' : '建立文章時發生錯誤，請稍後再試。')
      }
    }

  const handleValidationError = (errors: any) => {
    console.log('Validation errors:', errors)  // ← 加這行
    toast.error('表單驗證失敗，請檢查必填欄位並修正。')
  }

  const submitHandler = (type: 'draft' | 'publish' | 'archive') =>
    form.handleSubmit(handleSubmit(type), handleValidationError)

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <FileTextIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h1 className="text-lg sm:text-xl font-bold text-balance">
                文章編輯器: {isEditMode ? '編輯文章' : '新增文章'}
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
                disabled={isSaving}
                className="gap-1 sm:gap-2 bg-transparent px-2 sm:px-3"
                type="button"
              >
                <SaveIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {isSaving ? '儲存中...' : '儲存'}
                </span>
              </Button>

              <Button
                size="sm"
                onClick={submitHandler('publish')}
                disabled={isSaving}
                className="gap-1 sm:gap-2 px-2 sm:px-3"
                type="button"
              >
                <SendIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {isSaving ? '發佈中...' : '發佈'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <form id="post-form">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
            <div className="lg:col-span-3 space-y-4 sm:space-y-6 order-1">
              <FieldGroup className="space-y-4 sm:space-y-6">
                {/* ★ title */}
                <Field data-invalid={!!errors.title}>
                  <Input
                    {...form.register('title')}
                    placeholder="輸入文章標題..."
                    aria-invalid={!!errors.title}
                  />
                  <FieldError errors={errors.title ? [errors.title] : []} />
                </Field>

                {/* ★ summary */}
                <Field data-invalid={!!errors.summary}>
                  <Input
                    {...form.register('summary')}
                    placeholder="簡短描述文章內容..."
                    aria-invalid={!!errors.summary}
                  />
                  <FieldError errors={errors.summary ? [errors.summary] : []} />
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
                      <FieldError errors={fieldState.error ? [fieldState.error] : []} />
                    </Field>
                  )}
                />
              </FieldGroup>
            </div>

            <div className="lg:col-span-1 space-y-4 sm:space-y-6 order-2">
              <Card className="border-0 shadow-sm overflow-visible">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <FolderIcon className="h-4 w-4 text-primary" />
                    分類與標籤
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {/* ★ category */}
                  <Controller
                    control={form.control}
                    name="category"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={!!fieldState.error}>
                        <FieldLabel className="text-xs text-muted-foreground">
                          分類
                        </FieldLabel>
                        <Select
                          items={
                            categoriesData?.data.map((cat) => ({
                              label: cat.name,
                              value: cat.id,
                            })) || []
                          }
                          value={field.value.id}
                          onValueChange={(value) => {
                            const selected = categoriesData?.data.find(
                              (cat) => cat.id === value
                            )
                            field.onChange(selected || null)
                          }}
                        >
                          <SelectTrigger className="w-full" aria-invalid={!!fieldState.error}>
                            {categoriesData ? (
                              <SelectValue placeholder="選擇分類" />
                            ) : (
                              <Loader2Icon className="animate-spin text-muted-foreground" />
                            )}
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false}>
                            {categoriesData?.data.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError errors={fieldState.error ? [fieldState.error] : []} />
                      </Field>
                    )}
                  />

                  {/* ★ tags */}
                  <Controller
                    control={form.control}
                    name="tags"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={!!fieldState.error}>
                        <FieldLabel className="text-xs text-muted-foreground">
                          標籤
                        </FieldLabel>
                        <MultipleSelector
                          options={
                            tagsData
                              ? tagsData.data.map((tag) => ({
                                  label: tag.name,
                                  value: tag.id,
                                }))
                              : []
                          }
                          value={(field.value || []).map((tag) => ({
                            label: tag.name,
                            value: tag.id,
                          }))}
                          onChange={(options) => {
                            field.onChange(
                              options.map((opt) => ({
                                id: opt.value,
                                name: opt.label,
                              }))
                            )
                          }}
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
                        <FieldError errors={fieldState.error ? [fieldState.error] : []} />
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <ClockIcon className="h-4 w-4 text-primary" />
                      發佈設定
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3 sm:space-y-4">
                    {/* ★ status */}
                    <Controller
                      control={form.control}
                      name="status"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={!!fieldState.error}>
                          <FieldLabel className="text-xs text-muted-foreground">
                            狀態
                          </FieldLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger aria-invalid={!!fieldState.error}>
                              <SelectValue placeholder="選擇狀態">
                                {POST_STATUS_LIST.find(
                                  (s) => s.value === field.value
                                )?.label || '選擇狀態'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false}>
                              {POST_STATUS_LIST.map((status) => (
                                <SelectItem
                                  key={status.value}
                                  value={status.value}
                                >
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FieldError errors={fieldState.error ? [fieldState.error] : []} />
                        </Field>
                      )}
                    />

                    {/* ★ slug */}
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
                      <FieldError errors={errors.slug ? [errors.slug] : []} />
                    </Field>
                  </CardContent>
                </Card>

                {/* ★ cover */}
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
                      <FieldError errors={errors.cover ? [errors.cover] : []} />
                    </Field>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <SettingsIcon className="h-4 w-4 text-primary" />
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
                      render={({ field, fieldState }) => (
                        <Field data-invalid={!!fieldState.error}>
                          <FieldLabel className="text-xs text-muted-foreground">
                            置頂順序
                          </FieldLabel>
                          <Input
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              field.onChange(val === '' ? undefined : Number(val))
                            }}
                            type="number"
                            min={0}
                            placeholder="0"
                            className="text-sm"
                            aria-invalid={!!fieldState.error}
                          />
                          <FieldError errors={fieldState.error ? [fieldState.error] : []} />
                        </Field>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}