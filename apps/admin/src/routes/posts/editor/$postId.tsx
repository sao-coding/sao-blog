import AdminShell from '@/components/layout/admin-shell'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/utils/orpc'
import { ClockIcon, EyeIcon, FileText, FileTextIcon, FolderIcon, ImageIcon, Loader2Icon, SaveIcon, SendIcon, SettingsIcon } from 'lucide-react'
import { Button } from '@sao-blog/ui/components/button'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@sao-blog/ui/components/card'
import { Field, FieldGroup, FieldError, FieldLabel, FieldContent } from '@sao-blog/ui/components/field'
import { Input } from '@sao-blog/ui/components/input'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { MonacoEditor } from '@/components/monaco-editor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sao-blog/ui/components/select'
import { Checkbox } from '@sao-blog/ui/components/checkbox'
import MultipleSelector from '@sao-blog/ui/components/multiple-selector'
import { zodResolver } from '@hookform/resolvers/zod'
import type z from 'zod'
import { postSchema } from '@sao-blog/api/schema/post'
import { useIsMobile } from '@sao-blog/ui/hooks/use-mobile'

export const Route = createFileRoute('/posts/editor/$postId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { postId } = Route.useParams()
  const isMobile = useIsMobile()
  const { data: postData, status: postStatus } = useQuery(orpc.admin.post.getPost.queryOptions({ input: { id: postId } }))
  const { data: categoriesData, status: categoriesStatus } = useQuery(orpc.admin.category.getCategories.queryOptions())
  const { data: tagsData, status: tagsStatus } = useQuery(orpc.admin.tag.getTags.queryOptions())

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      slug: '',
      title: '',
      content: '',
      summary: '',
      category: undefined,
      tags: [],
      cover: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      allowComments: true,
      pin: false,
      pinOrder: 0,
      status: 'draft',
    },
  })

  const isPinned = useWatch({
    control: form.control,
    name: 'pin',
    defaultValue: false,
  })

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <FileTextIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
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
                <EyeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">預覽</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                // onClick={form.handleSubmit(onSaveDraft, (errors) => {
                //   console.log('validation errors:', errors)
                //   toast.error('表單驗證失敗，請檢查必填欄位並修正。')
                // })}
                // disabled={isSavingDraft || isPublishing}
                className="gap-1 sm:gap-2 bg-transparent px-2 sm:px-3"
              >
                <SaveIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {/* {isSavingDraft ? '儲存中...' : '儲存'} */}
                </span>
              </Button>
              <Button
                size="sm"
                // onClick={form.handleSubmit(onPublish, (errors) => {
                //   console.log('validation errors:', errors)
                //   toast.error('表單驗證失敗，請檢查必填欄位並修正。')
                // })}
                // disabled={isSavingDraft || isPublishing}
                className="gap-1 sm:gap-2 px-2 sm:px-3"
              >
                <SendIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {/* {isPublishing ? '發佈中...' : '發佈'} */}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <form id="post-form">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-4 sm:space-y-6 order-1">
              <FieldGroup className="space-y-4 sm:space-y-6">
                <Field>
                  <Input
                    {...form.register('title')}
                    placeholder="輸入文章標題..."
                  />
                  <FieldError />
                </Field>

                <Field>
                  <Input
                    {...form.register('summary')}
                    placeholder="簡短描述文章內容..."
                  />
                  <FieldError />
                </Field>

                <Controller
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <Field>
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
                      <FieldError />
                    </Field>
                  )}
                />
              </FieldGroup>
            </div>

            <div className="lg:col-span-1 space-y-4 sm:space-y-6 order-2">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <FolderIcon className="h-4 w-4 text-primary" />
                    分類與標籤
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <Controller
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <Field>
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
                        <FieldError />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <Field>
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
                        <FieldError />
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
                      <ClockIcon className="h-4 w-4 text-primary" />
                      發佈設定
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3 sm:space-y-4">
                    <Controller
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <Field>
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
                          <FieldError />
                        </Field>
                      )}
                    />

                    <Field>
                      <FieldLabel className="text-xs text-muted-foreground">
                        網址
                      </FieldLabel>
                      <Input
                        {...form.register('slug')}
                        placeholder="article-url-slug"
                        className="text-sm"
                      />
                      <FieldError />
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
                    <Field>
                      <Input
                        {...form.register('cover')}
                        placeholder="圖片 URL"
                        className="text-sm"
                      />
                      <FieldError/>
                    </Field>
                  </CardContent>
                </Card>
              </div>

              {/* Article Settings */}
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
                      render={({ field }) => (
                        <Field>
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
                          />
                          <FieldError />
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
