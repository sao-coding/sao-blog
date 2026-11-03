'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangleIcon, BotIcon, SaveIcon, SendIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@sao-blog/ui/components/button'
import { Checkbox } from '@sao-blog/ui/components/checkbox'
import { Field, FieldContent, FieldLabel } from '@sao-blog/ui/components/field'
import { Input } from '@sao-blog/ui/components/input'
import { useIsMobile } from '@sao-blog/ui/hooks/use-mobile'
import { MonacoEditor } from '@/components/monaco-editor'
import { orpc } from '@/utils/orpc'
import { apiErrorMessage, isPublished, LOCALE_LABELS, type Locale } from './locales'

interface TranslationEditorProps {
  kind: 'post' | 'note'
  ownerId: string
  locale: Locale
}

/**
 * 非原文語言版本的編輯區（原文仍由原本的文章 / 日記表單編修）。
 * 存檔走 upsert*Translation：發布時 MDX 有錯誤會被後端拒絕並回傳行號。
 */
export function TranslationEditor({ kind, ownerId, locale }: TranslationEditorProps) {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()

  const postQuery = useQuery({
    ...orpc.admin.post.getPostTranslations.queryOptions({ input: { postId: ownerId } }),
    enabled: kind === 'post',
  })
  const noteQuery = useQuery({
    ...orpc.admin.note.getNoteTranslations.queryOptions({ input: { noteId: ownerId } }),
    enabled: kind === 'note',
  })
  const { isPending } = kind === 'post' ? postQuery : noteQuery

  const rows: Array<{
    locale: Locale
    title: string
    summary?: string | null
    content: string
    status: string | boolean
    isSource: boolean
    translatedBy: 'human' | 'ai'
    outdated: boolean
  }> = (kind === 'post' ? postQuery.data?.data : noteQuery.data?.data) ?? []
  const source = rows.find((r) => r.isSource)
  const row = rows.find((r) => r.locale === locale && !r.isSource)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [aiTranslated, setAiTranslated] = useState(false)
  const [showSource, setShowSource] = useState(!isMobile)

  // 切換語系或資料載入後，以該語言版本（沒有則空白）初始化表單
  useEffect(() => {
    setTitle(row?.title ?? '')
    setSummary(row?.summary ?? '')
    setContent(row?.content ?? '')
    setAiTranslated(row?.translatedBy === 'ai')
  }, [locale, row?.title, row?.summary, row?.content, row?.translatedBy])

  const invalidate = () => queryClient.invalidateQueries()

  const upsertPost = useMutation(orpc.admin.post.upsertPostTranslation.mutationOptions())
  const upsertNote = useMutation(orpc.admin.note.upsertNoteTranslation.mutationOptions())
  const deletePost = useMutation(orpc.admin.post.deletePostTranslation.mutationOptions())
  const deleteNote = useMutation(orpc.admin.note.deleteNoteTranslation.mutationOptions())
  const isSaving = upsertPost.isPending || upsertNote.isPending
  const isDeleting = deletePost.isPending || deleteNote.isPending

  const save = async (publish: boolean) => {
    if (!title.trim() || !content.trim()) {
      toast.error('請填寫標題與內容')
      return
    }
    const translatedBy = aiTranslated ? 'ai' : 'human'
    try {
      const res =
        kind === 'post'
          ? await upsertPost.mutateAsync({
              postId: ownerId,
              locale,
              title,
              summary: summary.trim() ? summary : null,
              content,
              status: publish ? 'published' : 'draft',
              translatedBy,
            })
          : await upsertNote.mutateAsync({
              noteId: ownerId,
              locale,
              title,
              content,
              status: publish,
              translatedBy,
            })
      const error = apiErrorMessage(res)
      if (error) {
        toast.error(error, { duration: 10000 })
        return
      }
      toast.success(res.message)
      await invalidate()
    } catch (err) {
      console.error(err)
      toast.error('儲存譯文時發生錯誤，請稍後再試。')
    }
  }

  const remove = async () => {
    if (!row || !confirm(`確定刪除 ${LOCALE_LABELS[locale]} 版本？`)) return
    try {
      const res =
        kind === 'post'
          ? await deletePost.mutateAsync({ postId: ownerId, locale })
          : await deleteNote.mutateAsync({ noteId: ownerId, locale })
      const error = apiErrorMessage(res)
      if (error) {
        toast.error(error)
        return
      }
      toast.success('譯文已刪除')
      await invalidate()
    } catch (err) {
      console.error(err)
      toast.error('刪除譯文時發生錯誤，請稍後再試。')
    }
  }

  if (isPending) {
    return <p className="py-8 text-center text-sm text-muted-foreground">載入語言版本中…</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{LOCALE_LABELS[locale]} 版本</span>
          <span>·</span>
          <span>
            {row ? (isPublished(row.status) ? '已發布' : '草稿') : '尚未建立'}
          </span>
          {row?.translatedBy === 'ai' && (
            <span className="inline-flex items-center gap-1">
              · <BotIcon className="size-3.5" /> AI 翻譯
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {row && (
            <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={isDeleting} className="gap-1 text-destructive">
              <Trash2Icon className="size-4" />
              <span className="hidden sm:inline">刪除譯文</span>
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => save(false)} disabled={isSaving} className="gap-1">
            <SaveIcon className="size-4" />
            {isSaving ? '儲存中...' : '儲存草稿'}
          </Button>
          <Button type="button" size="sm" onClick={() => save(true)} disabled={isSaving} className="gap-1">
            <SendIcon className="size-4" />
            {isSaving ? '發佈中...' : '發佈譯文'}
          </Button>
        </div>
      </div>

      {row?.outdated && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          原文在這份譯文之後被修改過，請對照原文更新後再儲存（儲存後即標記為最新）。
        </div>
      )}

      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${LOCALE_LABELS[locale]} 標題（原文：${source?.title ?? ''}）`} />
      {kind === 'post' && (
        <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="摘要（未填會由內文自動產生）" />
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Field orientation="horizontal" className="w-auto">
          <Checkbox checked={aiTranslated} onCheckedChange={(v) => setAiTranslated(Boolean(v))} />
          <FieldContent>
            <FieldLabel className="text-sm">AI 翻譯</FieldLabel>
          </FieldContent>
        </Field>
        <Field orientation="horizontal" className="w-auto">
          <Checkbox checked={showSource} onCheckedChange={(v) => setShowSource(Boolean(v))} />
          <FieldContent>
            <FieldLabel className="text-sm">並排顯示原文</FieldLabel>
          </FieldContent>
        </Field>
      </div>

      <div className={showSource ? 'grid grid-cols-1 gap-4 lg:grid-cols-2' : ''}>
        {showSource && (
          <div className="overflow-hidden rounded-lg border">
            <p className="border-b bg-muted px-3 py-1.5 text-xs text-muted-foreground">原文（唯讀）</p>
            <pre
              className="overflow-auto whitespace-pre-wrap break-words bg-muted/30 p-3 font-mono text-xs leading-relaxed"
              style={{ height: isMobile ? '300px' : '700px' }}
            >
              {source?.content ?? ''}
            </pre>
          </div>
        )}
        <div className="overflow-hidden rounded-lg">
          <MonacoEditor
            value={content}
            onChange={(v) => setContent(v ?? '')}
            language="markdown"
            height={isMobile ? '400px' : '700px'}
            onSave={() => save(false)}
          />
        </div>
      </div>
    </div>
  )
}
