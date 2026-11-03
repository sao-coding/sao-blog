import { useRef, type ReactNode } from 'react'
import type { editor } from 'monaco-editor'
import { Button } from '@sao-blog/ui/components/button'
import { Separator } from '@sao-blog/ui/components/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@sao-blog/ui/components/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@sao-blog/ui/components/dropdown-menu'
import { Kbd } from '@sao-blog/ui/components/kbd'
import { cn } from '@sao-blog/ui/lib/utils'
import {
  BlocksIcon,
  ChevronDownIcon,
  ColumnsIcon,
  EyeIcon,
  HeadingIcon,
  ImageUpIcon,
  KeyboardIcon,
  Maximize2Icon,
  Minimize2Icon,
  PencilLineIcon,
  Redo2Icon,
  Undo2Icon,
  type LucideIcon,
} from 'lucide-react'
import { ACTIONS, HEADING_ACTIONS, formatShortcut, type EditorAction } from './editor-actions'
import { COMPONENT_SNIPPETS, DIAGRAM_SNIPPETS } from './snippets'
import { insertBlock, insertInline, uploadImages } from './markdown-commands'
import type { ViewMode } from './types'

type Editor = editor.IStandaloneCodeEditor

interface MonacoToolbarProps {
  editor: Editor | null
  onImageUpload?: (file: File) => Promise<string>
  viewMode: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
  fullscreen: boolean
  onFullscreenChange: (value: boolean) => void
  /** 手機：沒有分割模式、不顯示快捷鍵清單 */
  compact?: boolean
}

function ToolButton({
  icon: Icon,
  label,
  shortcut,
  onClick,
  disabled,
  active,
}: {
  icon: LucideIcon
  label: string
  shortcut?: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            // 避免按鈕搶走編輯器焦點與選取範圍
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={cn('text-muted-foreground hover:text-foreground', active && 'bg-accent text-foreground')}
          />
        }
      >
        <Icon />
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        {shortcut && <Kbd>{formatShortcut(shortcut)}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

const Divider = () => <Separator orientation="vertical" className="mx-1 h-5 self-center" />

export function MonacoToolbar({
  editor,
  onImageUpload,
  viewMode,
  onViewModeChange,
  fullscreen,
  onFullscreenChange,
  compact = false,
}: MonacoToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const disabled = !editor
  const run = (action: EditorAction) => () => editor && action.run(editor)
  const btn = (action: EditorAction) => (
    <ToolButton
      key={action.id}
      icon={action.icon}
      label={action.label}
      shortcut={action.shortcut}
      onClick={run(action)}
      disabled={disabled}
    />
  )

  return (
    <div className="flex items-center border-b bg-muted/30">
      {/* 格式工具在窄螢幕可以橫向滑動；右邊的檢視切換固定不動 */}
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-1.5 py-1 [mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)] [scrollbar-width:none]">
      <ToolButton icon={Undo2Icon} label="復原" shortcut="Ctrl+Z" disabled={disabled} onClick={() => editor?.trigger('toolbar', 'undo', null)} />
      <ToolButton icon={Redo2Icon} label="重做" shortcut="Ctrl+Shift+Z" disabled={disabled} onClick={() => editor?.trigger('toolbar', 'redo', null)} />
      <Divider />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              className="gap-0.5 px-1.5 text-muted-foreground hover:text-foreground"
              aria-label="標題層級"
            />
          }
        >
          <HeadingIcon />
          <ChevronDownIcon className="size-3 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {HEADING_ACTIONS.map((a) => (
            <DropdownMenuItem key={a.id} onClick={run(a)}>
              <a.icon />
              {a.label}
              <DropdownMenuShortcut>{formatShortcut(a.shortcut)}</DropdownMenuShortcut>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {[ACTIONS.bold, ACTIONS.italic, ACTIONS.strike, ACTIONS.code].map(btn)}
      <Divider />
      {[ACTIONS.quote, ACTIONS.bullet, ACTIONS.ordered, ACTIONS.task].map(btn)}
      <Divider />
      {btn(ACTIONS.link)}
      {onImageUpload && (
        <>
          <ToolButton
            icon={ImageUpIcon}
            label="上傳圖片（也可直接貼上或拖曳）"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              if (editor && files.length) void uploadImages(editor, files, onImageUpload)
            }}
          />
        </>
      )}
      {[ACTIONS.table, ACTIONS.codeBlock, ACTIONS.hr].map(btn)}
      <Divider />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              className="gap-1 px-2 text-muted-foreground hover:text-foreground"
            />
          }
        >
          <BlocksIcon />
          <span className="hidden md:inline">插入元件</span>
          <ChevronDownIcon className="size-3 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>MDX 元件</DropdownMenuLabel>
            {COMPONENT_SNIPPETS.map((s) => (
              <DropdownMenuItem key={s.label} onClick={() => editor && (s.inline ? insertInline : insertBlock)(editor, s.body)} className="flex-col items-start gap-0">
                <span>{s.label}</span>
                <span className="text-xs text-muted-foreground">{s.description}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>圖表與公式</DropdownMenuLabel>
            {DIAGRAM_SNIPPETS.map((s) => (
              <DropdownMenuItem key={s.label} onClick={() => editor && (s.inline ? insertInline : insertBlock)(editor, s.body)} className="flex-col items-start gap-0">
                <span>{s.label}</span>
                <span className="text-xs text-muted-foreground">{s.description}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      </div>

      <div className="flex shrink-0 items-center gap-0.5 border-l py-1 pr-1.5 pl-1.5">
        {onViewModeChange && (
          <div className="mr-1 flex items-center rounded-md border bg-background/40 p-0.5">
            {(
              [
                ['edit', PencilLineIcon, '只編輯'],
                ['split', ColumnsIcon, '編輯＋預覽'],
                ['preview', EyeIcon, '只預覽'],
              ] as const
            ).filter(([mode]) => !(compact && mode === 'split')).map(([mode, Icon, label]) => (
              <Tooltip key={mode}>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={label}
                      aria-pressed={viewMode === mode}
                      onClick={() => onViewModeChange(mode)}
                      className={cn(
                        'inline-flex h-6 items-center gap-1 rounded px-2 text-xs text-muted-foreground transition-colors hover:text-foreground',
                        viewMode === mode && 'bg-primary text-primary-foreground hover:text-primary-foreground'
                      )}
                    />
                  }
                >
                  <Icon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {label}
                  {mode === 'split' && <Kbd>{formatShortcut('Ctrl+Alt+P')}</Kbd>}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
        {!compact && <ShortcutsMenu />}
        <ToolButton
          icon={fullscreen ? Minimize2Icon : Maximize2Icon}
          label={fullscreen ? '離開專注模式' : '專注模式'}
          shortcut={fullscreen ? 'Esc' : 'Ctrl+Shift+Enter'}
          onClick={() => onFullscreenChange(!fullscreen)}
        />
      </div>
    </div>
  )
}

const EXTRA_SHORTCUTS: [string, string][] = [
  ['儲存', 'Ctrl+S'],
  ['切換預覽', 'Ctrl+Alt+P'],
  ['專注模式', 'Ctrl+Shift+Enter'],
  ['尋找 / 取代', 'Ctrl+F / Ctrl+H'],
  ['多重游標', 'Alt+Click'],
  ['命令面板', 'F1'],
]

function ShortcutsMenu(): ReactNode {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="快捷鍵"
                  onMouseDown={(e) => e.preventDefault()}
                  className="text-muted-foreground hover:text-foreground"
                />
              }
            />
          }
        >
          <KeyboardIcon />
        </TooltipTrigger>
        <TooltipContent side="bottom">快捷鍵</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="max-h-[70vh] w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>格式</DropdownMenuLabel>
          {Object.values(ACTIONS)
            .filter((a): a is EditorAction & { shortcut: string } => 'shortcut' in a && !!a.shortcut)
            .map((a) => (
              <DropdownMenuItem key={a.id} className="pointer-events-none">
                {a.label}
                <DropdownMenuShortcut>{formatShortcut(a.shortcut)}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>編輯器</DropdownMenuLabel>
          {EXTRA_SHORTCUTS.map(([label, key]) => (
            <DropdownMenuItem key={label} className="pointer-events-none">
              {label}
              <DropdownMenuShortcut>{formatShortcut(key)}</DropdownMenuShortcut>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
