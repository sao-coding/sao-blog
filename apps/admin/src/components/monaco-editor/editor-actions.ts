import type { editor } from 'monaco-editor'
import type { Monaco } from '@monaco-editor/react'
import {
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListChecksIcon,
  ListOrderedIcon,
  MinusIcon,
  PilcrowIcon,
  QuoteIcon,
  SquareCodeIcon,
  StrikethroughIcon,
  TableIcon,
  type LucideIcon,
} from 'lucide-react'
import {
  insertBlock,
  insertLink,
  insertTable,
  setHeading,
  toggleBulletList,
  toggleOrderedList,
  toggleQuote,
  toggleTaskList,
  wrapSelection,
} from './markdown-commands'

type Editor = editor.IStandaloneCodeEditor

export interface EditorAction {
  id: string
  label: string
  icon: LucideIcon
  /** 顯示用的快捷鍵文字（Ctrl 會在 Mac 上換成 ⌘） */
  shortcut?: string
  keybinding?: (m: Monaco) => number
  run: (ed: Editor) => void
}

const ctrl = (m: Monaco) => m.KeyMod.CtrlCmd
const shift = (m: Monaco) => m.KeyMod.Shift
const alt = (m: Monaco) => m.KeyMod.Alt

// 工具列按鈕、快捷鍵、右鍵選單、F1 命令面板共用同一份定義
export const ACTIONS = {
  bold: {
    id: 'md.bold',
    label: '粗體',
    icon: BoldIcon,
    shortcut: 'Ctrl+B',
    keybinding: (m) => ctrl(m) | m.KeyCode.KeyB,
    run: (ed) => wrapSelection(ed, '**', '**', '粗體文字'),
  },
  italic: {
    id: 'md.italic',
    label: '斜體',
    icon: ItalicIcon,
    shortcut: 'Ctrl+I',
    keybinding: (m) => ctrl(m) | m.KeyCode.KeyI,
    run: (ed) => wrapSelection(ed, '*', '*', '斜體文字'),
  },
  strike: {
    id: 'md.strike',
    label: '刪除線',
    icon: StrikethroughIcon,
    shortcut: 'Ctrl+Shift+X',
    keybinding: (m) => ctrl(m) | shift(m) | m.KeyCode.KeyX,
    run: (ed) => wrapSelection(ed, '~~', '~~', '刪除文字'),
  },
  code: {
    id: 'md.inlineCode',
    label: '行內程式碼',
    icon: CodeIcon,
    shortcut: 'Ctrl+E',
    keybinding: (m) => ctrl(m) | m.KeyCode.KeyE,
    run: (ed) => wrapSelection(ed, '`', '`', 'code'),
  },
  paragraph: {
    id: 'md.paragraph',
    label: '內文',
    icon: PilcrowIcon,
    shortcut: 'Ctrl+Alt+0',
    keybinding: (m) => ctrl(m) | alt(m) | m.KeyCode.Digit0,
    run: (ed) => setHeading(ed, 0),
  },
  h1: {
    id: 'md.h1',
    label: '標題 1',
    icon: Heading1Icon,
    shortcut: 'Ctrl+Alt+1',
    keybinding: (m) => ctrl(m) | alt(m) | m.KeyCode.Digit1,
    run: (ed) => setHeading(ed, 1),
  },
  h2: {
    id: 'md.h2',
    label: '標題 2',
    icon: Heading2Icon,
    shortcut: 'Ctrl+Alt+2',
    keybinding: (m) => ctrl(m) | alt(m) | m.KeyCode.Digit2,
    run: (ed) => setHeading(ed, 2),
  },
  h3: {
    id: 'md.h3',
    label: '標題 3',
    icon: Heading3Icon,
    shortcut: 'Ctrl+Alt+3',
    keybinding: (m) => ctrl(m) | alt(m) | m.KeyCode.Digit3,
    run: (ed) => setHeading(ed, 3),
  },
  h4: {
    id: 'md.h4',
    label: '標題 4',
    icon: Heading4Icon,
    shortcut: 'Ctrl+Alt+4',
    keybinding: (m) => ctrl(m) | alt(m) | m.KeyCode.Digit4,
    run: (ed) => setHeading(ed, 4),
  },
  quote: {
    id: 'md.quote',
    label: '引用',
    icon: QuoteIcon,
    shortcut: 'Ctrl+Shift+.',
    keybinding: (m) => ctrl(m) | shift(m) | m.KeyCode.Period,
    run: toggleQuote,
  },
  bullet: {
    id: 'md.bulletList',
    label: '項目清單',
    icon: ListIcon,
    shortcut: 'Ctrl+Shift+8',
    keybinding: (m) => ctrl(m) | shift(m) | m.KeyCode.Digit8,
    run: toggleBulletList,
  },
  ordered: {
    id: 'md.orderedList',
    label: '編號清單',
    icon: ListOrderedIcon,
    shortcut: 'Ctrl+Shift+7',
    keybinding: (m) => ctrl(m) | shift(m) | m.KeyCode.Digit7,
    run: toggleOrderedList,
  },
  task: {
    id: 'md.taskList',
    label: '待辦清單',
    icon: ListChecksIcon,
    shortcut: 'Ctrl+Shift+9',
    keybinding: (m) => ctrl(m) | shift(m) | m.KeyCode.Digit9,
    run: toggleTaskList,
  },
  link: {
    id: 'md.link',
    label: '連結',
    icon: LinkIcon,
    shortcut: 'Ctrl+K',
    keybinding: (m) => ctrl(m) | m.KeyCode.KeyK,
    run: insertLink,
  },
  codeBlock: {
    id: 'md.codeBlock',
    label: '程式碼區塊',
    icon: SquareCodeIcon,
    shortcut: 'Ctrl+Alt+C',
    keybinding: (m) => ctrl(m) | alt(m) | m.KeyCode.KeyC,
    run: (ed) => insertBlock(ed, '```$0\n\n```'),
  },
  table: {
    id: 'md.table',
    label: '表格',
    icon: TableIcon,
    run: (ed) => insertTable(ed),
  },
  hr: {
    id: 'md.hr',
    label: '分隔線',
    icon: MinusIcon,
    run: (ed) => insertBlock(ed, '---\n$0'),
  },
} satisfies Record<string, EditorAction>

export const HEADING_ACTIONS = [ACTIONS.paragraph, ACTIONS.h1, ACTIONS.h2, ACTIONS.h3, ACTIONS.h4]

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function formatShortcut(shortcut: string) {
  return isMac ? shortcut.replace(/Ctrl/g, '⌘').replace(/Alt/g, '⌥').replace(/Shift/g, '⇧').replace(/\+/g, '') : shortcut
}

/** 註冊到 Monaco：快捷鍵＋右鍵選單（格式相關的放進「Markdown」群組）＋ F1 命令面板 */
export function registerActions(ed: Editor, m: Monaco, extra: EditorAction[] = []) {
  const contextMenu = new Set(['md.bold', 'md.italic', 'md.link', 'md.inlineCode', 'md.codeBlock', 'md.quote'])
  const all: EditorAction[] = [...Object.values(ACTIONS), ...extra]
  return all.map((action, i) =>
    ed.addAction({
      id: action.id,
      label: `Markdown：${action.label}`,
      keybindings: action.keybinding ? [action.keybinding(m)] : undefined,
      contextMenuGroupId: contextMenu.has(action.id) ? '1_markdown' : undefined,
      contextMenuOrder: i,
      run: () => action.run(ed),
    })
  )
}
