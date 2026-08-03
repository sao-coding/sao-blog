'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckIcon, ChevronDownIcon, CopyIcon, FileCode2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 超過這個行數就預設收合，避免長程式碼把文章版面撐爆
const COLLAPSE_LINE_THRESHOLD = 15
// 收合時保留的高度（約 15 行程式碼）
const COLLAPSED_HEIGHT = 360

export interface CodeBlockHeaderProps {
  /** fenced code block 的語言（例如 ts、python），沒有標記語言時顯示 text */
  lang?: string
  /** 純文字程式碼內容，用來複製到剪貼簿與計算行數 */
  codeText: string
  /** 已高亮的 <pre><code> 內容 */
  children: React.ReactNode
}

/**
 * 包在 Shiki 高亮過的 <pre> 外層的 header：
 * 左邊顯示語言 icon + 名稱，右邊是複製按鈕；程式碼太長時可摺疊。
 */
export function CodeBlockHeader({
  lang,
  codeText,
  children,
}: CodeBlockHeaderProps) {
  const [copied, setCopied] = useState(false)
  const lineCount = codeText.split('\n').length
  const isLong = lineCount > COLLAPSE_LINE_THRESHOLD
  const [collapsed, setCollapsed] = useState(isLong)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fullHeight, setFullHeight] = useState<number>()

  // 持續量測實際內容高度（scrollHeight 在 overflow-hidden 收合時依然準確），
  // 展開時才有正確的目標高度可以過渡動畫，而不是用一個很大的假高度硬做。
  useEffect(() => {
    if (!isLong || !contentRef.current) return
    const el = contentRef.current
    const observer = new ResizeObserver(() => setFullHeight(el.scrollHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [isLong])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText)
      setCopied(true)
      toast.success('已複製程式碼')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('複製失敗')
    }
  }

  return (
    <div className="not-prose my-4 overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileCode2 className="size-3.5" aria-hidden />
          <span className="font-mono">{lang || 'text'}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          aria-label="複製程式碼"
        >
          {copied ? (
            <CheckIcon className="size-3.5" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </Button>
      </div>
      <div
        ref={contentRef}
        style={
          isLong ? { maxHeight: collapsed ? COLLAPSED_HEIGHT : fullHeight } : undefined
        }
        className={cn(
          isLong &&
            'overflow-hidden transition-[max-height] duration-300 ease-in-out'
        )}
      >
        {children}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex w-full items-center justify-center gap-1 border-t border-border bg-muted/50 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDownIcon
            className={cn(
              'size-3.5 transition-transform duration-300',
              !collapsed && 'rotate-180'
            )}
          />
          {collapsed ? `展開程式碼（共 ${lineCount} 行）` : '收合程式碼'}
        </button>
      )}
    </div>
  )
}
