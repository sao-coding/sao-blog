'use client'

import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { Copy, MessageSquareQuote, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCommentQuoteStore } from '@/store/comment-quote-store'

type BubbleState = {
  top: number
  left: number
  text: string
  hasCommentSection: boolean
}

const VIEWPORT_MARGIN = 8
const SETTLE_DELAY = 30

export function SelectionBubbleMenu() {
  const [bubble, setBubble] = useState<BubbleState | null>(null)

  const updateFromSelection = useCallback(() => {
    const sel = window.getSelection()
    const text = sel?.toString() ?? ''
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !text) {
      setBubble(null)
      return
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      setBubble(null)
      return
    }
    setBubble({
      top: Math.max(rect.top - VIEWPORT_MARGIN, VIEWPORT_MARGIN),
      left: Math.min(
        Math.max(rect.left + rect.width / 2, 80),
        window.innerWidth - 80,
      ),
      text,
      // 只在目前頁面有留言區（文章、日記）時才顯示「引用評論」
      hasCommentSection: !!document.getElementById('comment-section'),
    })
  }, [])

  useEffect(() => {
    // 手機拖曳選字把手調整後，選取範圍要等一拍才會穩定下來
    function handleSelectionEnd() {
      window.setTimeout(updateFromSelection, SETTLE_DELAY)
    }
    // 選取被收合（例如點到別處）時要立刻收起，不用等 mouseup/touchend
    function handleSelectionChange() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) setBubble(null)
    }
    function dismiss() {
      setBubble(null)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss()
    }

    document.addEventListener('mouseup', handleSelectionEnd)
    document.addEventListener('touchend', handleSelectionEnd)
    document.addEventListener('selectionchange', handleSelectionChange)
    window.addEventListener('scroll', dismiss, { capture: true, passive: true })
    window.addEventListener('resize', dismiss)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mouseup', handleSelectionEnd)
      document.removeEventListener('touchend', handleSelectionEnd)
      document.removeEventListener('selectionchange', handleSelectionChange)
      window.removeEventListener('scroll', dismiss, { capture: true })
      window.removeEventListener('resize', dismiss)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [updateFromSelection])

  if (!bubble) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(bubble.text)
    setBubble(null)
  }
  const handleSearch = () => {
    window.open(
      `https://www.google.com/search?q=${encodeURIComponent(bubble.text)}`,
      '_blank',
    )
    setBubble(null)
  }
  const handleAsk = () => {
    window.open(
      `https://chatgpt.com/?q=${encodeURIComponent(bubble.text)}`,
      '_blank',
    )
    setBubble(null)
  }
  const handleQuote = () => {
    useCommentQuoteStore.getState().setPendingQuote(bubble.text)
    document
      .getElementById('comment-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setBubble(null)
  }

  return (
    <div
      className="fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
      style={{ top: bubble.top, left: bubble.left }}
    >
      <BubbleButton label="複製" onClick={handleCopy}>
        <Copy className="size-4" />
      </BubbleButton>
      <BubbleButton label="搜尋" onClick={handleSearch}>
        <Search className="size-4" />
      </BubbleButton>
      <BubbleButton label="詢問 ChatGPT" onClick={handleAsk}>
        <Sparkles className="size-4" />
      </BubbleButton>
      {bubble.hasCommentSection && (
        <BubbleButton label="引用評論" onClick={handleQuote}>
          <MessageSquareQuote className="size-4" />
        </BubbleButton>
      )}
    </div>
  )
}

function BubbleButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  // 用 preventDefault 讓按下按鈕時不會先收合掉底層的文字選取
  const keepSelection = (event: ReactMouseEvent) => event.preventDefault()

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={keepSelection}
      onClick={onClick}
      className={cn(
        'flex size-8 items-center justify-center rounded-md',
        'hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {children}
    </button>
  )
}
