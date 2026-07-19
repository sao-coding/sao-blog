'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SendIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useCommentQuoteStore } from '@/store/comment-quote-store'
import { commentSchema, type CommentFormValues } from '@/schemas/comment'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FieldError } from '@/components/ui/field'
import { CommentMarkdownRenderer } from './comment-markdown-renderer'
import { CommentEmojiPicker } from './comment-emoji-picker'
import { getRandomPlaceholder } from './constants'

interface CommentFormProps {
  onSubmit: (data: CommentFormValues) => void
  parentId?: string | null
  compact?: boolean
  onCancel?: () => void
  isSubmitting?: boolean
  userName?: string
  userImage?: string | null
}

export function CommentForm({
  onSubmit,
  parentId,
  compact = false,
  onCancel,
  isSubmitting = false,
  userName,
  userImage,
}: CommentFormProps) {
  const [placeholder] = useState(() => getRandomPlaceholder())
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '' },
  })

  const { ref: formContentRef, ...contentRegisterRest } = register('content')
  const contentValue = watch('content')

  const pendingQuote = useCommentQuoteStore((s) => s.pendingQuote)
  const clearPendingQuote = useCommentQuoteStore((s) => s.clearPendingQuote)
  const consumedQuoteIdRef = useRef<number | null>(null)

  // 只有頂層留言表單（非回覆表單）接受右鍵選單的「引用評論」
  // 用 ref 記錄已套用過的 quote id，避免 React Strict Mode 的 effect 重複執行造成內容重複插入兩次
  useEffect(() => {
    if (parentId || !pendingQuote) return
    if (consumedQuoteIdRef.current === pendingQuote.id) return
    consumedQuoteIdRef.current = pendingQuote.id

    const quoted = `> ${pendingQuote.text.replace(/\n/g, '\n> ')}\n\n`
    const current = getValues('content')
    setValue('content', current ? `${current}\n\n${quoted}` : quoted, {
      shouldValidate: true,
    })
    clearPendingQuote()
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [parentId, pendingQuote, clearPendingQuote, getValues, setValue])

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      const textarea = textareaRef.current
      if (!textarea) {
        setValue('content', getValues('content') + emoji, { shouldValidate: true })
        return
      }
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const current = getValues('content')
      setValue('content', current.slice(0, start) + emoji + current.slice(end), { shouldValidate: true })
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length
        textarea.focus()
      })
    },
    [getValues, setValue]
  )

  const handleFormSubmit = (data: CommentFormValues) => {
    onSubmit(data)
    reset({ content: '' })
  }

  const userInitial = userName ? userName[0]?.toUpperCase() : '?'

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className={cn(
        'space-y-3 rounded-lg border border-border bg-card p-4',
        compact && 'p-3'
      )}
    >
      {/* 使用者資訊列 */}
      {userName && (
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            {userImage && <AvatarImage src={userImage} alt={userName} />}
            <AvatarFallback className="text-xs">{userInitial}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground">{userName}</span>
        </div>
      )}

      {/* 內容區域：撰寫 / 預覽分頁 */}
      <Tabs defaultValue={0}>
        <TabsList>
          <TabsTrigger value={0}>撰寫</TabsTrigger>
          <TabsTrigger value={1}>預覽</TabsTrigger>
        </TabsList>

        <TabsContent value={0}>
          <div className="space-y-2">
            <Textarea
              placeholder={placeholder}
              className={cn('min-h-28 font-mono text-sm', compact && 'min-h-20')}
              aria-invalid={!!errors.content}
              ref={(el) => {
                formContentRef(el)
                textareaRef.current = el
              }}
              {...contentRegisterRest}
            />
            <FieldError errors={[errors.content]} />
          </div>
        </TabsContent>

        <TabsContent value={1}>
          <div
            className={cn(
              'min-h-28 rounded-lg border border-border bg-muted/30 p-3',
              compact && 'min-h-20'
            )}
          >
            {contentValue?.trim() ? (
              <CommentMarkdownRenderer content={contentValue} />
            ) : (
              <p className="text-muted-foreground text-sm italic">尚無內容可預覽</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 底部操作列 */}
      <div className="flex items-center justify-between">
        <CommentEmojiPicker onEmojiSelect={handleEmojiSelect} />

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              取消
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isSubmitting}>
            <SendIcon className="size-3.5" data-icon="inline-start" />
            {isSubmitting ? '送出中...' : parentId ? '回覆' : '送出留言'}
          </Button>
        </div>
      </div>
    </form>
  )
}
