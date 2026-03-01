import { useEffect } from 'react'
import type { IKeyboardEvent } from 'monaco-editor'
import { MonacoShortcutsProps } from './types'

/**
 * 一個 React Hook，用於在 Monaco 編輯器中註冊鍵盤快捷鍵。
 * @param props - 包含編輯器實例和回調函式的屬性。
 */
export function useMonacoShortcuts({
  editor,
  onBold,
  onItalic,
  onLink,
  onImage,
  onUndo,
  onRedo,
}: MonacoShortcutsProps) {
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (e: IKeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey

      if (isCtrlOrCmd) {
        switch (e.code) {
          // KeyS (save) 故意不在此處處理；如果需要，應由外部 UI 完成儲存。
          case 'KeyB':
            e.preventDefault()
            onBold()
            break
          case 'KeyI':
            e.preventDefault()
            onItalic()
            break
          case 'KeyK':
            e.preventDefault()
            onLink()
            break
          case 'KeyG':
            if (e.shiftKey) {
              e.preventDefault()
              onImage()
            }
            break
          case 'KeyZ':
            // Ctrl/Cmd+Z => undo; Ctrl/Cmd+Shift+Z => redo (在 mac 上很常見)
            e.preventDefault()
            if (e.shiftKey) {
              if (onRedo) onRedo()
            } else {
              if (onUndo) onUndo()
            }
            break
          case 'KeyY':
            // Ctrl/Cmd+Y => redo (在 Windows 上很常見)
            e.preventDefault()
            if (onRedo) onRedo()
            break
        }
      }
    }

    // 監聽 Monaco 編輯器的鍵盤事件
    const disposable = editor.onKeyDown(handleKeyDown)

    // 清理函數
    return () => {
      if (disposable && typeof disposable.dispose === 'function') {
        disposable.dispose()
      }
    }
  }, [editor, onBold, onItalic, onLink, onImage, onUndo, onRedo])
}
