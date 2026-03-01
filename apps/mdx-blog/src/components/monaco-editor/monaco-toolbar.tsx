import React from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Bold,
  Italic,
  Link,
  Image,
  CornerUpLeft,
  CornerUpRight,
} from 'lucide-react'
import { MonacoToolbarProps } from './types'

/**
 * 用於 Monaco 編輯器的工具列元件。
 * 提供常用 Markdown 格式的按鈕，如粗體、斜體、連結、復原和取消復原。
 * @param props - 工具列的屬性，包含各種操作的回調函式和禁用狀態。
 */
export function MonacoToolbar({
  onBold,
  onItalic,
  onLink,
  onImage,
  onUndo,
  onRedo,
  disabled = false,
}: MonacoToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-2 border-b bg-card">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={disabled}
          title="復原 (Ctrl+Z)"
          className="h-8 w-8 p-0"
        >
          <CornerUpLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={disabled}
          title="取消復原 (Ctrl+Y / Ctrl+Shift+Z)"
          className="h-8 w-8 p-0"
        >
          <CornerUpRight className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBold}
          disabled={disabled}
          title="切換粗體 (Ctrl+B)"
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onItalic}
          disabled={disabled}
          title="切換斜體 (Ctrl+I)"
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLink}
          disabled={disabled}
          title="切換連結 (Ctrl+K)"
          className="h-8 w-8 p-0"
        >
          <Link className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onImage}
          disabled={disabled}
          title="插入圖片 (Ctrl+Shift+G)"
          className="h-8 w-8 p-0"
        >
          <Image className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Save button intentionally removed - use keyboard shortcut or external save UI */}
    </div>
  )
}
