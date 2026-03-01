/**
 * 留言表單元件
 *
 * 包含「撰寫」與「預覽」分頁、表單驗證、Emoji 插入功能。
 * 使用 react-hook-form + Zod 進行表單校驗。
 * 使用者身份（暱稱、Email、網址）會儲存至 localStorage 以便下次自動填入。
 *
 * @module components/comment/comment-form
 */

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SendIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { commentSchema, type CommentFormValues } from '@/schemas/comment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from '@/components/ui/field'
import { CommentMarkdownRenderer } from './comment-markdown-renderer'
import { CommentEmojiPicker } from './comment-emoji-picker'
import { getRandomPlaceholder, COMMENT_USER_STORAGE_KEY } from './constants'

interface CommentFormProps {
  /**
   * 表單送出回調
   * @param data - 驗證後的表單資料
   */
  onSubmit: (data: CommentFormValues) => void
  /** 父留言 ID（回覆用） */
  parentId?: string | null
  /** 是否為精簡模式（回覆表單） */
  compact?: boolean
  /** 取消回覆的回調 */
  onCancel?: () => void
  /** 是否正在送出中 */
  isSubmitting?: boolean
}

/**
 * 留言表單
 *
 * 提供暱稱、Email、網址（選填）、內容欄位。
 * 內容區域使用 Tabs 切換「撰寫」與「預覽」模式。
 * 支援 Emoji 按鈕在光標處插入表情。
 *
 * @param props - 表單屬性
 * @returns 表單元件
 */
export function CommentForm({
  onSubmit,
  parentId,
  compact = false,
  onCancel,
  isSubmitting = false,
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
    defaultValues: {
      displayUsername: '',
      email: '',
      website: '',
      content: '',
    },
  })

  /** 從 localStorage 載入使用者身份 */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COMMENT_USER_STORAGE_KEY)
      if (saved) {
        const identity = JSON.parse(saved) as Partial<CommentFormValues>
        if (identity.displayUsername) setValue('displayUsername', identity.displayUsername)
        if (identity.email) setValue('email', identity.email)
        if (identity.website) setValue('website', identity.website)
      }
    } catch {
      // localStorage 讀取失敗時忽略
    }
  }, [setValue])

  /** 將 textarea ref 與 react-hook-form 的 ref 合併 */
  const { ref: formContentRef, ...contentRegisterRest } = register('content')

  /** 監聽內容變化以供預覽使用 */
  const contentValue = watch('content')

  /**
   * 處理 Emoji 選取：在 textarea 光標處插入 Emoji
   * @param emoji - 被選取的 Emoji 字元
   */
  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      const textarea = textareaRef.current
      if (!textarea) {
        // 如果沒有 textarea ref，直接 append
        const current = getValues('content')
        setValue('content', current + emoji, { shouldValidate: true })
        return
      }

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentValue = getValues('content')
      const newValue =
        currentValue.slice(0, start) + emoji + currentValue.slice(end)

      setValue('content', newValue, { shouldValidate: true })

      // 設定光標位置到 Emoji 之後
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd =
          start + emoji.length
        textarea.focus()
      })
    },
    [getValues, setValue]
  )

  /**
   * 表單送出處理
   * @param data - 驗證後的表單資料
   */
  const handleFormSubmit = (data: CommentFormValues) => {
    // 儲存使用者身份到 localStorage
    try {
      localStorage.setItem(
        COMMENT_USER_STORAGE_KEY,
        JSON.stringify({
          displayUsername: data.displayUsername,
          email: data.email,
          website: data.website,
        })
      )
    } catch {
      // localStorage 寫入失敗時忽略
    }

    onSubmit(data)
    reset({ ...data, content: '' })
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className={cn(
        'space-y-3 rounded-lg border border-border bg-card p-4',
        compact && 'p-3'
      )}
    >
      {/* 使用者身份欄位 */}
      <FieldGroup>
        <div
          className={cn(
            'grid gap-3',
            compact ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'
          )}
        >
          <Field orientation="vertical">
            <FieldLabel>
              暱稱 <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              placeholder="你的暱稱"
              aria-invalid={!!errors.displayUsername}
              {...register('displayUsername')}
            />
            <FieldError errors={[errors.displayUsername]} />
          </Field>

          <Field orientation="vertical">
            <FieldLabel>
              Email <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              type="email"
              placeholder="email@example.com"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field orientation="vertical">
            <FieldLabel>網址</FieldLabel>
            <Input
              type="url"
              placeholder="https://example.com"
              aria-invalid={!!errors.website}
              {...register('website')}
            />
            <FieldError errors={[errors.website]} />
          </Field>
        </div>
      </FieldGroup>

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
              <p className="text-muted-foreground text-sm italic">
                尚無內容可預覽
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 底部操作列：Emoji + 送出按鈕 */}
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
