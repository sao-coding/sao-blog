import type { editor } from 'monaco-editor'
import { TEXT_ACTIONS, TextAction } from './types'

export class MonacoTextHelper {
  constructor(private editor: editor.IStandaloneCodeEditor) {}

  /**
   * 檢查文字是否已經被指定的標記包圍。
   * @param text - 要檢查的文字。
   * @param before - 前標記。
   * @param after - 後標記，如果未提供則使用前標記。
   * @returns - 如果文字被包圍則返回 true，否則返回 false。
   */
  private isTextWrapped(text: string, before: string, after?: string): boolean {
    const afterMark = after || before
    return text.startsWith(before) && text.endsWith(afterMark)
  }

  /**
   * 移除文字周圍的標記。
   * @param text - 要處理的文字。
   * @param before - 前標記。
   * @param after - 後標記，如果未提供則使用前標記。
   * @returns - 移除標記後的文字。
   */
  private unwrapText(text: string, before: string, after?: string): string {
    const afterMark = after || before
    if (this.isTextWrapped(text, before, afterMark)) {
      return text.slice(before.length, -afterMark.length)
    }
    return text
  }

  /**
   * 切換選中文字的指定標記。
   * @param action - 要執行的文字操作。
   */
  private toggleTextWrapping(action: TextAction): void {
    const selection = this.editor.getSelection()
    if (!selection) return

    const model = this.editor.getModel()
    if (!model) return

    const selectedText = model.getValueInRange(selection) || ''

    let newText: string
    let newSelectionLength: number

    if (selectedText) {
      // 如果有選中文字
      const afterMark = action.after || action.before

      if (this.isTextWrapped(selectedText, action.before, afterMark)) {
        // 如果已經被包裹，則移除標記
        newText = this.unwrapText(selectedText, action.before, afterMark)
        newSelectionLength = newText.length
      } else {
        // 如果沒有被包裹，則添加標記
        newText = `${action.before}${selectedText}${afterMark}`
        newSelectionLength = selectedText.length
      }
    } else {
      // 如果沒有選中文字，插入佔位符
      const afterMark = action.after || action.before
      newText = `${action.before}${action.placeholder || ''}${afterMark}`
      newSelectionLength = action.placeholder?.length || 0
    }

    // 執行編輯操作
    this.editor.executeEdits('text-helper', [
      {
        range: selection,
        text: newText,
        forceMoveMarkers: true,
      },
    ])

    // 重新設置選擇範圍
    if (!selectedText && action.placeholder) {
      // 沒有選中文字時，選中佔位符
      const newSelection = {
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn + action.before.length,
        endLineNumber: selection.startLineNumber,
        endColumn:
          selection.startColumn + action.before.length + newSelectionLength,
      }
      this.editor.setSelection(newSelection)
    } else if (
      selectedText &&
      !this.isTextWrapped(
        selectedText,
        action.before,
        action.after || action.before
      )
    ) {
      // 如果是添加標記，選中原文字（不包括標記）
      const newSelection = {
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn + action.before.length,
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn + action.before.length,
      }
      this.editor.setSelection(newSelection)
    }

    // 聚焦編輯器
    this.editor.focus()
  }

  /**
   * 切換粗體格式。
   */
  applyBold(): void {
    this.toggleTextWrapping(TEXT_ACTIONS.bold)
  }

  /**
   * 切換斜體格式。
   */
  applyItalic(): void {
    this.toggleTextWrapping(TEXT_ACTIONS.italic)
  }

  /**
   * 插入連結格式。
   */
  insertLink(): void {
    this.toggleTextWrapping(TEXT_ACTIONS.link)
  }

  /**
   * 插入圖片格式。
   */
  insertImage(): void {
    this.toggleTextWrapping(TEXT_ACTIONS.image)
  }

  /**
   * 取得目前編輯器的值。
   * @returns - 編輯器的目前內容。
   */
  getValue(): string {
    return this.editor.getValue() || ''
  }

  /**
   * 設置編輯器的值。
   * @param value - 要設定的內容。
   */
  setValue(value: string): void {
    this.editor.setValue(value)
  }
}
