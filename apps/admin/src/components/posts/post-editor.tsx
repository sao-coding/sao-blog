'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { orpc, queryClient } from '@/utils/orpc'
import {
  ArrowLeftIcon,
  ImageIcon,
  Loader2Icon,
  PanelRightIcon,
  SaveIcon,
  SendIcon,
  SlidersHorizontalIcon,
} from 'lucide-react'
import { cn } from '@sao-blog/ui/lib/utils'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@sao-blog/ui/components/drawer'
import { Button } from '@sao-blog/ui/components/button'
import { toast } from 'sonner'
import { Badge } from '@sao-blog/ui/components/badge'
import { Separator } from '@sao-blog/ui/components/separator'
import { Switch } from '@sao-blog/ui/components/switch'
import { Textarea } from '@sao-blog/ui/components/textarea'
import {
  Field,
  FieldGroup,
  FieldError,
  FieldLabel,
  FieldContent,
} from '@sao-blog/ui/components/field'
import { Input } from '@sao-blog/ui/components/input'
import { Controller, useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { MonacoEditor, PreviewFrame, type EditorDiagnostic } from '@/components/monaco-editor'
import { useFileUpload } from '@/hooks/use-file-upload'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sao-blog/ui/components/select'
import MultipleSelector from '@sao-blog/ui/components/multiple-selector'
import { zodResolver } from '@hookform/resolvers/zod'
import type z from 'zod'
import { postInputSchema } from '@sao-blog/api/schema/post'
import { useIsMobile } from '@sao-blog/ui/hooks/use-mobile'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { LanguageTabs, useTranslationStates, type LanguageTab } from '@/components/translations/language-tabs'
import { TranslationEditor } from '@/components/translations/translation-editor'
import { apiErrorMessage } from '@/components/translations/locales'

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
  category: {
    id: '',
  },
  tags: [],
}

// 收在「文章設定」面板 / Drawer 裡的欄位
const SETTINGS_FIELDS = ['status', 'slug', 'category', 'tags', 'cover', 'allowComments', 'pin', 'pinOrder'] as const

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

const POST_STATUS_LIST = [
  { label: '草稿', value: 'draft' },
  { label: '已發佈', value: 'published' },
  { label: '已封存', value: 'archived' },
] as const

export function PostEditor({ postId }: PostEditorProps) {
  const isEditMode = Boolean(postId)
  const isMobile = useIsMobile()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  // 桌面版設定面板每次進來都是打開的
  const [panelOpen, setPanelOpen] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const settingsOpen = isDesktop ? panelOpen : drawerOpen
  const toggleSettings = () => (isDesktop ? setPanelOpen(!panelOpen) : setDrawerOpen(!drawerOpen))
  const navigate = useNavigate()
  const { uploadFile } = useFileUpload()
  const [activeTab, setActiveTab] = useState<LanguageTab>('source')
  const { states: translationStates, sourceLocale } = useTranslationStates('post', postId)
  const editingTranslation = isEditMode && activeTab !== 'source'

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
  const status = useWatch({ control: form.control, name: 'status' })
  const cover = useWatch({ control: form.control, name: 'cover' })
  const statusLabel = POST_STATUS_LIST.find((s) => s.value === status)?.label
  const title = useWatch({ control: form.control, name: 'title' })
  const content = useWatch({ control: form.control, name: 'content' })
  const [scrollRatio, setScrollRatio] = useState(0)
  const [diagnostics, setDiagnostics] = useState<EditorDiagnostic[]>([])
  const createdAt = postData?.status === 'success' && 'createdAt' in postData.data ? (postData.data.createdAt as Date | string) : undefined

  const createPostMutation = useMutation(orpc.admin.post.createPost.mutationOptions())
  const updatePostMutation = useMutation(orpc.admin.post.updatePost.mutationOptions())

  const isSaving =
    createPostMutation.isPending || updatePostMutation.isPending

  const handleSubmit =
    (type: 'draft' | 'publish' | 'archive') =>
    async (data: PostFormValues) => {
      if (type === 'publish') data.status = 'published'
      if (type === 'archive') data.status = 'archived'
      try {
        // API 以 status: "error" 回報錯誤（例如發布時 MDX 編譯失敗，訊息含行號），不會 throw
        const res = isEditMode
          ? await updatePostMutation.mutateAsync(data)
          : await createPostMutation.mutateAsync(data)
        const error = apiErrorMessage(res)
        if (error) {
          toast.error(error, { duration: 10000 })
          return
        }
        // 草稿有 MDX 錯誤時仍會儲存，message 會附上警告
        const warned = res.message.includes('MDX 有錯誤')
        if (warned) toast.warning(res.message, { duration: 10000 })
        else toast.success(type === 'publish' ? '文章已發佈！' : isEditMode ? '已儲存' : '文章建立成功！')
        // handleSubmit 拿到的是表單值的複本：要寫回表單，否則發佈後狀態仍顯示草稿，
        // 下一次 Ctrl+S 會把文章存回草稿（等於取消發佈）
        form.reset(data)
        void queryClient.invalidateQueries({ queryKey: orpc.admin.post.key() })
        if (!isEditMode) navigate({ to: '/posts' })
      } catch (err) {
        console.error(err)
        toast.error(isEditMode ? '更新文章時發生錯誤，請稍後再試。' : '建立文章時發生錯誤，請稍後再試。')
      }
    }

  const handleValidationError = (fieldErrors: FieldErrors<PostFormValues>) => {
    const inSettings = SETTINGS_FIELDS.some((name) => name in fieldErrors)
    // 錯誤欄位收在設定裡時把它打開，不然使用者看不到哪裡錯
    if (inSettings) {
      if (isDesktop) setPanelOpen(true)
      else setDrawerOpen(true)
    }
    toast.error(inSettings ? '文章設定有欄位需要修正。' : '表單驗證失敗，請檢查必填欄位並修正。')
  }
  const settingsHasError = SETTINGS_FIELDS.some((name) => name in errors)

  const isDirty = form.formState.isDirty
  const isPublished = status === 'published'

  // 有未儲存的修改時，關閉分頁 / 重新整理前提醒
  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const submitHandler = (type: 'draft' | 'publish' | 'archive') =>
    form.handleSubmit(handleSubmit(type), handleValidationError)

  // 文章設定：桌面版是可收合的右側面板，平板 / 手機是從底部拉起的 Drawer；同一份欄位只會掛在其中一邊
  const settingsFields = (
      <FieldGroup className="gap-4">
        <SectionTitle>發佈</SectionTitle>
  
        {/* ★ status */}
        <Controller
          control={form.control}
          name="status"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error}>
              <FieldLabel className="text-xs text-muted-foreground">狀態</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full" aria-invalid={!!fieldState.error}>
                  <SelectValue placeholder="選擇狀態">{statusLabel || '選擇狀態'}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {POST_STATUS_LIST.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
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
          <FieldLabel className="text-xs text-muted-foreground">網址代稱</FieldLabel>
          <Input
            {...form.register('slug')}
            placeholder="留空則依標題產生"
            className="font-mono text-xs"
            aria-invalid={!!errors.slug}
          />
          <FieldError errors={errors.slug ? [errors.slug] : []} />
        </Field>
  
        <Separator />
        <SectionTitle>分類與標籤</SectionTitle>
  
        {/* ★ category */}
        <Controller
          control={form.control}
          name="category"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error}>
              <FieldLabel className="text-xs text-muted-foreground">分類</FieldLabel>
              <Select
                items={
                  categoriesData?.data.map((cat) => ({
                    label: cat.name,
                    value: cat.id,
                  })) || []
                }
                value={field.value.id}
                onValueChange={(value) => {
                  const selected = categoriesData?.data.find((cat) => cat.id === value)
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
              <FieldLabel className="text-xs text-muted-foreground">標籤</FieldLabel>
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
                placeholder="選擇標籤…"
                emptyIndicator={
                  <p className="text-center text-sm leading-10 text-muted-foreground">
                    {tagsStatus === 'pending' ? (
                      <Loader2Icon className="mx-auto animate-spin text-muted-foreground" />
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
  
        <Separator />
        <SectionTitle>封面</SectionTitle>
  
        {/* ★ cover */}
        <Field data-invalid={!!errors.cover}>
          <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/40">
            {cover ? (
              <img src={cover} alt="封面預覽" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-6 text-muted-foreground/60" />
            )}
          </div>
          <Input
            {...form.register('cover')}
            placeholder="圖片 URL"
            className="text-xs"
            aria-invalid={!!errors.cover}
          />
          <FieldError errors={errors.cover ? [errors.cover] : []} />
        </Field>
  
        <Separator />
        <SectionTitle>選項</SectionTitle>
  
        <Controller
          control={form.control}
          name="allowComments"
          render={({ field }) => (
            <Field orientation="horizontal" className="justify-between">
              <FieldContent>
                <FieldLabel className="text-sm">允許留言</FieldLabel>
                <p className="text-xs text-muted-foreground">讀者可以在文章下方留言</p>
              </FieldContent>
              <Switch checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
            </Field>
          )}
        />
  
        <Controller
          control={form.control}
          name="pin"
          render={({ field }) => (
            <Field orientation="horizontal" className="justify-between">
              <FieldContent>
                <FieldLabel className="text-sm">置頂文章</FieldLabel>
                <p className="text-xs text-muted-foreground">固定在列表頂部</p>
              </FieldContent>
              <Switch checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
            </Field>
          )}
        />
  
        {isPinned && (
          <Controller
            control={form.control}
            name="pinOrder"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <FieldLabel className="text-xs text-muted-foreground">置頂順序</FieldLabel>
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
      </FieldGroup>
  )

  return (
    <>
      <header className="sticky top-14 z-20 -mx-4 -mt-4 border-b bg-background/80 backdrop-blur-md md:-mx-6 md:-mt-6">
        <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              render={<Link to="/posts" />}
              nativeButton={false}
              aria-label="返回文章列表"
            >
              <ArrowLeftIcon />
            </Button>
            <h1 className="truncate text-base font-semibold">
              {isEditMode ? '編輯文章' : '新增文章'}
            </h1>
            {statusLabel && (
              <Badge variant={isPublished ? 'default' : 'secondary'}>
                {statusLabel}
              </Badge>
            )}
            <span className="hidden items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground xl:inline-flex">
              <span className={isDirty ? 'size-1.5 rounded-full bg-primary' : 'size-1.5 rounded-full bg-emerald-500'} />
              {isSaving ? '儲存中…' : isDirty ? '未儲存的修改' : '已儲存'}
            </span>
          </div>

          <div className={editingTranslation ? 'hidden' : 'flex items-center gap-1 sm:gap-2'}>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={toggleSettings}
              aria-pressed={settingsOpen}
              aria-label="文章設定"
              className={cn('relative', settingsOpen && 'bg-accent')}
            >
              {isDesktop ? <PanelRightIcon /> : <SlidersHorizontalIcon />}
              <span className="hidden sm:inline">設定</span>
              {settingsHasError && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-destructive" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={submitHandler('draft')}
              disabled={isSaving}
              type="button"
              title="以目前狀態儲存（Ctrl+S）"
            >
              <SaveIcon />
              <span className="hidden sm:inline">儲存</span>
            </Button>
            <Button
              size="sm"
              onClick={submitHandler('publish')}
              disabled={isSaving}
              type="button"
            >
              {isSaving ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
              <span className="hidden sm:inline">{isPublished ? '更新發佈' : '發佈'}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="pt-6">
        {isEditMode && (
          <div className="mb-6">
            <LanguageTabs
              value={activeTab}
              onValueChange={setActiveTab}
              sourceLocale={sourceLocale}
              states={translationStates}
            />
          </div>
        )}
        {isEditMode && activeTab !== 'source' && (
          <TranslationEditor kind="post" ownerId={postId!} locale={activeTab} />
        )}
        <form id="post-form" className={editingTranslation ? 'hidden' : undefined}>
          <div className={cn('grid grid-cols-1 gap-6 lg:gap-8', isDesktop && panelOpen && 'lg:grid-cols-[minmax(0,1fr)_300px]')}>
            <div className="min-w-0 space-y-4">
              {/* ★ title / summary：無框大字，像在紙上直接寫 */}
              <Field data-invalid={!!errors.title}>
                <input
                  {...form.register('title')}
                  placeholder="文章標題"
                  aria-invalid={!!errors.title}
                  className="w-full bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/50 sm:text-3xl"
                />
                <FieldError errors={errors.title ? [errors.title] : []} />
              </Field>

              <Field data-invalid={!!errors.summary}>
                <Textarea
                  {...form.register('summary')}
                  rows={1}
                  placeholder="寫一段簡短的摘要…"
                  aria-invalid={!!errors.summary}
                  className="min-h-0 resize-none border-0 bg-transparent px-0 py-0 text-base text-muted-foreground shadow-none focus-visible:ring-0 dark:bg-transparent"
                />
                <FieldError errors={errors.summary ? [errors.summary] : []} />
              </Field>

              <Controller
                control={form.control}
                name="content"
                render={({ field, fieldState }) => (
                  <Field data-invalid={!!fieldState.error}>
                    <MonacoEditor
                      value={field.value}
                      onChange={(v) => field.onChange(v ?? '')}
                      language="markdown"
                      height={isMobile ? 'max(360px, calc(100dvh - 290px))' : 'max(480px, calc(100vh - 310px))'}
                      onSave={submitHandler('draft')}
                      onImageUpload={uploadFile}
                      onScrollRatioChange={setScrollRatio}
                      diagnostics={diagnostics}
                      preview={
                        <PreviewFrame
                          title={title}
                          cover={cover}
                          content={content}
                          createdAt={createdAt}
                          scrollRatio={scrollRatio}
                          onDiagnostics={setDiagnostics}
                        />
                      }
                    />
                    <FieldError errors={fieldState.error ? [fieldState.error] : []} />
                  </Field>
                )}
              />
            </div>

            {isDesktop && panelOpen && (
              <aside className="sticky top-32 max-h-[calc(100vh-9rem)] self-start overflow-y-auto rounded-xl border bg-card/70 p-4 shadow-sm backdrop-blur-sm">
                {settingsFields}
              </aside>
            )}
          </div>

          {!isDesktop && (
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerContent className="max-h-[88dvh]">
                <DrawerHeader>
                  <DrawerTitle>文章設定</DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{settingsFields}</div>
              </DrawerContent>
            </Drawer>
          )}
        </form>
      </div>
    </>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">{children}</h2>
  )
}
