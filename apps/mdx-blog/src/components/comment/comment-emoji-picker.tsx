/**
 * Emoji 選擇器元件
 *
 * 使用 emoji-picker-react 實現 Emoji 選擇功能，
 * 支援深色／淺色主題自動切換。
 *
 * @module components/comment/comment-emoji-picker
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react'
import { useTheme } from 'next-themes'
import { SmileIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import zh from 'emoji-picker-react/dist/data/emojis-zh-hant'

interface CommentEmojiPickerProps {
  /**
   * 選擇 Emoji 後的回調
   * @param emoji - 被選取的 Emoji 字元
   */
  onEmojiSelect: (emoji: string) => void
}

/**
 * Emoji 選擇器按鈕及彈出面板
 *
 * 點擊 Emoji 圖標按鈕後彈出選擇器面板，
 * 選擇 Emoji 後自動關閉面板並觸發回調。
 * 點擊面板外部區域亦可關閉。
 *
 * @param props - Emoji 選擇器屬性
 * @returns Emoji 選擇器元件
 */
export function CommentEmojiPicker({ onEmojiSelect }: CommentEmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()

  /** 點擊外部關閉 */
  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  /** 處理 Emoji 選取 */
  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      onEmojiSelect(emojiData.emoji)
      setOpen(false)
    },
    [onEmojiSelect]
  )

  /** 將 next-themes 主題映射為 emoji-picker-react 的 Theme */
  const pickerTheme = resolvedTheme === 'dark' ? Theme.DARK : Theme.LIGHT

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="插入 Emoji"
      >
        <SmileIcon className="size-4" />
      </Button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2">
          <EmojiPicker
            theme={pickerTheme}
            onEmojiClick={handleEmojiClick}
            width={320}
            height={400}
            searchPlaceholder="搜尋表情..."
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}
    </div>
  )
}
