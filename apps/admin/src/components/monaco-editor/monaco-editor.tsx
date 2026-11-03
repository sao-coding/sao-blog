import { useCallback, useEffect, useRef, useState } from 'react'
import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react'
import type { editor, IDisposable } from 'monaco-editor'
import { Loader2Icon } from 'lucide-react'
import { cn } from '@sao-blog/ui/lib/utils'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@sao-blog/ui/components/resizable'
import { useIsMobile } from '@sao-blog/ui/hooks/use-mobile'
import { MonacoToolbar } from './monaco-toolbar'
import { registerActions } from './editor-actions'
import { continueList, insertInline, uploadImages } from './markdown-commands'
import type { MonacoEditorProps, ViewMode } from './types'

// 整段剪貼簿內容剛好是一個 excalidraw.com 分享連結時才轉換（混在其他文字裡的不動）
const EXCALIDRAW_SHARE_LINK = /^https:\/\/excalidraw\.com\/#json=[\w-]+,[\w-]+$/
const URL_ONLY = /^https?:\/\/\S+$/

// 對齊 packages/ui theme.css 的「夜讀」配色：背景透明，由外框的 bg-card 決定底色
const defineSaoTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('sao-night', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'ECE6DA' },
      { token: 'keyword.md', foreground: 'E0BA74', fontStyle: 'bold' },
      { token: 'strong', fontStyle: 'bold' },
      { token: 'emphasis', fontStyle: 'italic' },
      { token: 'string.link.md', foreground: '7FC4C4' },
      { token: 'variable.md', foreground: 'E09A7A' },
      { token: 'variable.source', foreground: 'B8C0D6' },
      { token: 'tag', foreground: 'E0BA74' },
      { token: 'attribute.name', foreground: '9FC8A8' },
      { token: 'attribute.value', foreground: 'E09A7A' },
      { token: 'comment', foreground: '7A8299', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#00000000',
      'editorGutter.background': '#00000000',
      'minimap.background': '#00000000',
      'editorOverviewRuler.border': '#00000000',
      'editor.foreground': '#ECE6DA',
      'editorLineNumber.foreground': '#4E566C',
      'editorLineNumber.activeForeground': '#E0BA74',
      'editor.lineHighlightBackground': '#FFFFFF08',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#E0BA7433',
      'editor.inactiveSelectionBackground': '#E0BA741F',
      'editorCursor.foreground': '#E0BA74',
      'editorIndentGuide.background1': '#FFFFFF0D',
      'editorWidget.background': '#1B2133',
      'editorWidget.border': '#FFFFFF1A',
      'scrollbarSlider.background': '#FFFFFF14',
      'scrollbarSlider.hoverBackground': '#FFFFFF24',
      'scrollbarSlider.activeBackground': '#FFFFFF33',
    },
  })
}

/** 字形數量（使用者感知的字元，emoji 算一個） */
function countGraphemes(text: string): number {
  if (!text) return 0
  const normalized = text.replace(/\r\n/g, '\n')
  if (typeof Intl.Segmenter === 'function') {
    let count = 0
    for (const _ of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(normalized)) count++
    return count
  }
  return Array.from(normalized).length
}

/** 字數：中日文每個字算一個字，其他語言以單字計 */
function countWords(text: string): number {
  if (!text) return 0
  const cjk = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu)?.length ?? 0
  const other = text.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu, ' ').match(/[\p{L}\p{N}]+/gu)?.length ?? 0
  return cjk + other
}

interface Stats {
  words: number
  chars: number
  lines: number
  selWords: number
  selChars: number
  cursor: { line: number; column: number }
}

const EMPTY_STATS: Stats = { words: 0, chars: 0, lines: 1, selWords: 0, selChars: 0, cursor: { line: 1, column: 1 } }

export default function MonacoEditor({
  value,
  onChange,
  language = 'markdown',
  theme = 'sao-night',
  height = '400px',
  options = {},
  onSave,
  showToolbar = true,
  onImageUpload,
  preview,
  onScrollRatioChange,
  diagnostics,
}: MonacoEditorProps) {
  const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null)
  const disposablesRef = useRef<IDisposable[]>([])
  const [stats, setStats] = useState<Stats>(EMPTY_STATS)
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [fullscreen, setFullscreen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const isMobile = useIsMobile()

  // 這些 callback 每次 render 都是新的函式；Monaco 的 action 只註冊一次，所以透過 ref 讀最新值
  const latest = useRef({ onSave, onImageUpload, onScrollRatioChange, hasPreview: Boolean(preview) })
  latest.current = { onSave, onImageUpload, onScrollRatioChange, hasPreview: Boolean(preview) }

  const handleMount: OnMount = useCallback((ed, monaco) => {
    monacoRef.current = monaco
    setEditorInstance(ed)
    // Monaco 在 Windows 預設用 CRLF，存進資料庫的內文會混著 \r\n；統一成 LF。
    // model.setValue（例如表單 reset）會重新偵測換行字元，所以每次內容變動都要再確認一次
    const forceLF = () => {
      const model = ed.getModel()
      if (model && model.getEOL() !== '\n') model.setEOL(monaco.editor.EndOfLineSequence.LF)
    }
    forceLF()
    disposablesRef.current.push(ed.onDidChangeModelContent(forceLF))
    const disposables = disposablesRef.current

    disposables.push(
      ...registerActions(ed, monaco, [
        {
          id: 'editor.save',
          label: '儲存',
          icon: Loader2Icon,
          keybinding: (m) => m.KeyMod.CtrlCmd | m.KeyCode.KeyS,
          run: () => latest.current.onSave?.(),
        },
        {
          id: 'editor.togglePreview',
          label: '切換預覽',
          icon: Loader2Icon,
          keybinding: (m) => m.KeyMod.CtrlCmd | m.KeyMod.Alt | m.KeyCode.KeyP,
          run: () => latest.current.hasPreview && setViewMode((v) => (v === 'edit' ? 'split' : 'edit')),
        },
        {
          id: 'editor.toggleFullscreen',
          label: '專注模式',
          icon: Loader2Icon,
          keybinding: (m) => m.KeyMod.CtrlCmd | m.KeyMod.Shift | m.KeyCode.Enter,
          run: () => setFullscreen((v) => !v),
        },
      ])
    )

    // Enter 延續清單 / 引用；建議清單開著時交給 Monaco 處理（選取建議）
    ed.addCommand(
      monaco.KeyCode.Enter,
      () => {
        if (!continueList(ed)) ed.trigger('keyboard', 'type', { text: '\n' })
      },
      'editorTextFocus && !suggestWidgetVisible && !inSnippetMode && !findInputFocussed'
    )

    // 剪貼簿：
    // - 不能用 Monaco 的 onDidPaste：剪貼簿只有圖片、沒有文字時（例如螢幕截圖），Monaco 的
    //   paste handler 讀不到 text/plain 就直接 return，onDidPaste 根本不會觸發。
    // - 掛在 editor container 上部分版本不會觸發（monaco-editor#4099），所以掛在 document 的
    //   capture 階段自己讀原始 ClipboardEvent，處理完 stopPropagation 避免 Monaco 再貼一次。
    const handlePaste = (event: ClipboardEvent) => {
      if (!ed.hasTextFocus()) return
      const text = event.clipboardData?.getData('text/plain').trim() ?? ''
      const handled = () => {
        event.preventDefault()
        event.stopPropagation()
      }

      // excalidraw.com 分享連結 → <Excalidraw> 元件
      if (EXCALIDRAW_SHARE_LINK.test(text)) {
        handled()
        insertInline(ed, `<Excalidraw src="${text}" />`)
        return
      }

      // 選取文字後貼上網址 → 變成 [選取文字](網址)
      const sel = ed.getSelection()
      const selected = sel ? (ed.getModel()?.getValueInRange(sel) ?? '') : ''
      if (URL_ONLY.test(text) && selected && !selected.includes('\n') && !URL_ONLY.test(selected)) {
        handled()
        insertInline(ed, `[${selected}](${text})`)
        return
      }

      const upload = latest.current.onImageUpload
      const images = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null)
      if (upload && images.length) {
        handled()
        void uploadImages(ed, images, upload)
      }
    }
    document.addEventListener('paste', handlePaste, true)
    disposables.push({ dispose: () => document.removeEventListener('paste', handlePaste, true) })

    const updateStats = () => {
      const model = ed.getModel()
      const sel = ed.getSelection()
      if (!model) return
      const content = model.getValue()
      const selected = sel && !sel.isEmpty() ? model.getValueInRange(sel) : ''
      const pos = ed.getPosition()
      setStats({
        words: countWords(content),
        chars: countGraphemes(content),
        lines: model.getLineCount(),
        selWords: countWords(selected),
        selChars: countGraphemes(selected),
        cursor: { line: pos?.lineNumber ?? 1, column: pos?.column ?? 1 },
      })
    }
    updateStats()
    disposables.push(
      ed.onDidChangeModelContent(updateStats),
      ed.onDidChangeCursorSelection(updateStats),
      ed.onDidScrollChange((e) => {
        if (!e.scrollTopChanged) return
        const max = e.scrollHeight - ed.getLayoutInfo().height
        latest.current.onScrollRatioChange?.(max > 0 ? e.scrollTop / max : 0)
      })
    )
  }, [])

  useEffect(
    () => () => {
      disposablesRef.current.forEach((d) => d.dispose())
      disposablesRef.current = []
    },
    []
  )

  // 專注模式：Esc 離開、鎖住頁面捲動
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      // 有 Monaco 的尋找框 / 建議清單時 Esc 先給它們用
      if (e.key === 'Escape' && !document.querySelector('.monaco-editor .suggest-widget.visible, .monaco-editor .find-widget.visible')) {
        setFullscreen(false)
      }
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [fullscreen])

  // 外部錯誤（MDX 編譯）→ 編輯器裡的波浪底線
  useEffect(() => {
    const monaco = monacoRef.current
    const model = editorInstance?.getModel()
    if (!monaco || !model) return
    monaco.editor.setModelMarkers(
      model,
      'diagnostics',
      (diagnostics ?? [])
        .filter((d) => d.line)
        .map((d) => {
          const line = Math.min(d.line!, model.getLineCount())
          return {
            severity: monaco.MarkerSeverity.Error,
            message: d.message,
            startLineNumber: line,
            startColumn: d.column ?? 1,
            endLineNumber: line,
            endColumn: model.getLineMaxColumn(line),
          }
        })
    )
  }, [diagnostics, editorInstance])

  // 手機寬度放不下左右分割：只留「編輯／預覽」兩種，原本是分割就當成編輯
  const mode: ViewMode = isMobile && viewMode === 'split' ? 'edit' : viewMode
  const showEditor = !preview || mode !== 'preview'
  const showPreview = Boolean(preview) && mode !== 'edit'

  const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
    // 手機：字大一點、拿掉行號與摺疊，把寬度留給文字
    fontSize: isMobile ? 15 : 14,
    lineHeight: isMobile ? 26 : 24,
    fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, 'Noto Sans TC', monospace",
    padding: isMobile ? { top: 12, bottom: 12 } : { top: 16, bottom: 16 },
    lineNumbers: isMobile ? 'off' : 'on',
    lineNumbersMinChars: 3,
    lineDecorationsWidth: isMobile ? 12 : 8,
    glyphMargin: false,
    folding: !isMobile,
    roundedSelection: true,
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    automaticLayout: true,
    wordWrap: 'on',
    wrappingIndent: 'same',
    renderLineHighlight: 'line',
    matchBrackets: 'always',
    contextmenu: true,
    quickSuggestions: false,
    wordBasedSuggestions: 'off',
    unicodeHighlight: { ambiguousCharacters: false, invisibleCharacters: false },
    find: { addExtraSpaceOnTop: false, autoFindInSelection: 'never', seedSearchStringFromSelection: 'selection' },
    renderWhitespace: 'selection',
    smoothScrolling: true,
    cursorSmoothCaretAnimation: 'on',
    cursorBlinking: 'smooth',
    mouseWheelZoom: true,
    tabSize: 2,
    insertSpaces: true,
    dropIntoEditor: { enabled: false },
    scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
    ...options,
  }

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden border bg-card/70 shadow-sm',
        fullscreen ? 'fixed inset-0 z-50 rounded-none border-0 bg-background' : 'rounded-xl'
      )}
    >
      {showToolbar && (
        <MonacoToolbar
          editor={editorInstance}
          onImageUpload={onImageUpload}
          viewMode={mode}
          onViewModeChange={preview ? setViewMode : undefined}
          compact={isMobile}
          fullscreen={fullscreen}
          onFullscreenChange={setFullscreen}
        />
      )}

      <div
        className={cn('relative flex min-h-0', fullscreen && 'flex-1')}
        style={fullscreen ? undefined : { height }}
        onDragOver={(e) => {
          if (!onImageUpload || !e.dataTransfer.types.includes('Files')) return
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
        }}
        onDrop={(e) => {
          setDragging(false)
          if (!onImageUpload || !editorInstance) return
          const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
          if (!files.length) return
          e.preventDefault()
          // 插在放開滑鼠的位置
          const target = editorInstance.getTargetAtClientPoint(e.clientX, e.clientY)
          if (target?.position) editorInstance.setPosition(target.position)
          void uploadImages(editorInstance, files, onImageUpload)
        }}
      >
        {/* 編輯器 panel 永遠掛著（切換模式時不重建 Monaco、不丟游標與復原紀錄），
            只有分割模式才加上拖曳把手與預覽 panel */}
        <ResizablePanelGroup orientation="horizontal" className="group/split">
          <ResizablePanel id="editor" minSize="25" className={cn(!showEditor && 'hidden')}>
            <Editor
              height="100%"
              language={language}
              value={value}
              onChange={onChange}
              theme={theme}
              beforeMount={defineSaoTheme}
              options={defaultOptions}
              onMount={handleMount}
              loading={
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" />
                  載入編輯器中…
                </div>
              }
            />
          </ResizablePanel>
          {showPreview && showEditor && <ResizableHandle withHandle />}
          {showPreview && (
            <ResizablePanel id="preview" minSize="25" className="min-w-0">
              {preview}
            </ResizablePanel>
          )}
        </ResizablePanelGroup>

        {dragging && (
          <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/60 bg-background/70 text-sm text-primary backdrop-blur-sm">
            放開以上傳圖片
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t px-3 py-1.5 text-xs tabular-nums text-muted-foreground">
        <span>
          {stats.words} 字<span className="hidden sm:inline"> · {stats.chars} 字元 · {stats.lines} 行</span>
        </span>
        {stats.selChars > 0 && (
          <span className="text-primary">
            已選取 {stats.selWords} 字 · {stats.selChars} 字元
          </span>
        )}
        <span className="ml-auto hidden sm:inline">
          第 {stats.cursor.line} 行，第 {stats.cursor.column} 欄
        </span>
        {diagnostics && diagnostics.length > 0 && (
          <span className="text-destructive">{diagnostics.length} 個 MDX 錯誤</span>
        )}
      </div>
    </div>
  )
}
