'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EyeIcon, PencilLineIcon, SendIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useCommentQuoteStore } from '@/store/comment-quote-store'
import { commentSchema, type CommentFormValues } from '@/schemas/comment'
import { Button } from '@sao-blog/ui/components/button'
import { Textarea } from '@sao-blog/ui/components/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@sao-blog/ui/components/avatar'
import { FieldError } from '@sao-blog/ui/components/field'
import { CommentMarkdownRenderer } from './comment-markdown-renderer'
import { CommentEmojiPicker } from './comment-emoji-picker'
import { getRandomPlaceholder } from './constants'
import { Turnstile, turnstileSiteKey, type TurnstileHandle } from '@/components/turnstile'
import { m } from '#/paraglide/messages'

/** 送出時一起帶的防機器人欄位 */
export interface CommentGuardFields {
  hp?: string
  turnstileToken?: string
}

interface CommentFormProps {
  /** 回傳 true 代表送出成功，表單才會清空（失敗時保留內容，不用重打） */
  onSubmit: (data: CommentFormValues, guard: CommentGuardFields) => Promise<boolean> | boolean
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
  const [previewing, setPreviewing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const honeypotRef = useRef<HTMLInputElement | null>(null)
  const turnstileRef = useRef<TurnstileHandle>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const waitingForTurnstile = Boolean(turnstileSiteKey) && !turnstileToken

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
    setPreviewing(false)
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

  const handleFormSubmit = async (data: CommentFormValues) => {
    const ok = await onSubmit(data, {
      hp: honeypotRef.current?.value || undefined,
      turnstileToken: turnstileToken ?? undefined,
    })
    // Turnstile token 只能用一次，不論成功失敗都要換新的
    turnstileRef.current?.reset()
    if (ok) {
      reset({ content: '' })
      setPreviewing(false)
    }
  }

  const userInitial = userName ? userName[0]?.toUpperCase() : '?'
  const submitForm = handleSubmit(handleFormSubmit)
  const submitDisabled = isSubmitting || waitingForTurnstile

  return (
    <form
      onSubmit={submitForm}
      className={cn('relative flex items-start gap-3', !compact && 'flex-row-reverse')}
    >
      {/* 蜜罐：畫面與螢幕閱讀器都看不到，只有自動填表的機器人會填 */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {/* 頂層表單：自己的頭像在右側，跟自己的留言氣泡同一邊；
          回覆表單在回覆串裡，跟回覆一樣頭像靠左，氣泡尖角才有東西可以指 */}
      <Avatar size={compact ? 'sm' : 'default'} className={cn('shrink-0', !compact && 'size-9')}>
        {userImage && <AvatarImage src={userImage} alt={userName ?? ''} />}
        <AvatarFallback>{userInitial}</AvatarFallback>
      </Avatar>

      <div
        data-side={compact ? 'left' : 'right'}
        data-mine
        className="comment-bubble min-w-0 flex-1 p-1.5 transition-shadow focus-within:ring-2 focus-within:ring-ink/30"
      >
        {previewing ? (
          <div className={cn('min-h-24 px-3 py-2', compact && 'min-h-16')}>
            {contentValue?.trim() ? (
              <CommentMarkdownRenderer content={contentValue} />
            ) : (
              <p className="text-sm text-muted-foreground italic">{m.comment_no_preview()}</p>
            )}
          </div>
        ) : (
          <Textarea
            placeholder={placeholder}
            className={cn(
              'min-h-24 resize-none border-0 bg-transparent px-3 py-2 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent',
              compact && 'min-h-16'
            )}
            aria-label={parentId ? m.comment_reply() : m.comment_submit()}
            aria-invalid={!!errors.content}
            ref={(el) => {
              formContentRef(el)
              textareaRef.current = el
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !submitDisabled) {
                e.preventDefault()
                void submitForm()
              }
            }}
            {...contentRegisterRest}
          />
        )}
        <FieldError className="px-3" errors={[errors.content]} />

        <Turnstile ref={turnstileRef} action="comment" onToken={setTurnstileToken} />

        {/* 底部工具列 */}
        <div className="mt-1 flex items-center gap-1 border-t border-dashed border-rule px-1 pt-1.5">
          <CommentEmojiPicker onEmojiSelect={handleEmojiSelect} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setPreviewing((prev) => !prev)}
            aria-pressed={previewing}
          >
            {previewing ? <PencilLineIcon data-icon="inline-start" /> : <EyeIcon data-icon="inline-start" />}
            {previewing ? m.comment_write() : m.comment_preview()}
          </Button>

          <span className="ml-auto hidden text-[0.7rem] text-muted-foreground/80 sm:inline">
            {m.comment_shortcut_hint()}
          </span>

          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="ml-auto sm:ml-0">
              {m.comment_cancel()}
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={submitDisabled}
            className={cn('rounded-full px-3.5', !onCancel && 'ml-auto sm:ml-0')}
          >
            <SendIcon className="size-3.5" data-icon="inline-start" />
            {isSubmitting ? m.comment_submitting() : parentId ? m.comment_reply() : m.comment_submit()}
          </Button>
        </div>
      </div>
    </form>
  )
}
