import type { ReactNode } from 'react'
import type { editor } from 'monaco-editor'

export type ViewMode = 'edit' | 'split' | 'preview'

export interface EditorDiagnostic {
  line?: number
  column?: number
  message: string
}

export interface MonacoEditorProps {
  value: string
  onChange: (value: string | undefined) => void
  language?: string
  theme?: string
  height?: string
  options?: editor.IStandaloneEditorConstructionOptions
  /** Ctrl+S 時呼叫 */
  onSave?: () => void
  showToolbar?: boolean
  /** 貼上 / 拖曳 / 工具列上傳圖片時呼叫；回傳的網址會取代插入的佔位文字。未提供則不啟用圖片上傳。 */
  onImageUpload?: (file: File) => Promise<string>
  /** 提供時工具列會出現「編輯／分割／預覽」切換，並在右側顯示這個預覽 */
  preview?: ReactNode
  /** 編輯器捲動位置（0–1），給預覽同步捲動用 */
  onScrollRatioChange?: (ratio: number) => void
  /** 顯示在編輯器裡的錯誤（例如 MDX 編譯錯誤），會畫成波浪底線 */
  diagnostics?: EditorDiagnostic[]
}
