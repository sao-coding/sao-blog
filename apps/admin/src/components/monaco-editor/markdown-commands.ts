import type { editor, IRange } from 'monaco-editor'

type Editor = editor.IStandaloneCodeEditor

// 工具列、快捷鍵、右鍵選單共用的 Markdown 編輯操作。
// 每個操作都只走 executeEdits，所以都能被 Ctrl+Z 一次復原。

const CURSOR = '$0'

/** 包住選取文字；已被包住則拆掉（toggle）。沒選取時插入佔位文字並選起來方便直接改。 */
export function wrapSelection(ed: Editor, before: string, after = before, placeholder = '') {
  const model = ed.getModel()
  const sel = ed.getSelection()
  if (!model || !sel) return

  const text = model.getValueInRange(sel)

  // 選取範圍外側剛好就是標記（例如只選了 **粗體** 裡的字）→ 拆掉外側標記
  const outer: IRange = {
    startLineNumber: sel.startLineNumber,
    startColumn: Math.max(1, sel.startColumn - before.length),
    endLineNumber: sel.endLineNumber,
    endColumn: sel.endColumn + after.length,
  }
  const outerText = model.getValueInRange(outer)
  if (text && outerText === `${before}${text}${after}`) {
    ed.executeEdits('md-wrap', [{ range: outer, text, forceMoveMarkers: true }])
    ed.setSelection({ ...outer, endColumn: outer.startColumn + text.length, endLineNumber: outer.startLineNumber })
    ed.focus()
    return
  }

  if (text.startsWith(before) && text.endsWith(after) && text.length >= before.length + after.length) {
    const inner = text.slice(before.length, text.length - after.length)
    ed.executeEdits('md-wrap', [{ range: sel, text: inner, forceMoveMarkers: true }])
    ed.focus()
    return
  }

  const body = text || placeholder
  ed.executeEdits('md-wrap', [{ range: sel, text: `${before}${body}${after}`, forceMoveMarkers: true }])
  if (!body.includes('\n')) {
    const start = sel.startColumn + before.length
    ed.setSelection({
      startLineNumber: sel.startLineNumber,
      startColumn: start,
      endLineNumber: sel.startLineNumber,
      endColumn: start + body.length,
    })
  }
  ed.focus()
}

function selectedLineRange(ed: Editor) {
  const sel = ed.getSelection()!
  let end = sel.endLineNumber
  // 選到下一行開頭（column 1）時不算那一行
  if (end > sel.startLineNumber && sel.endColumn === 1) end--
  return { start: sel.startLineNumber, end }
}

/**
 * 對選取的每一行切換行首前綴（引用、清單、標題）。
 * pattern 用來辨識「這行已經有同類前綴」：全部都有 → 移除；否則統一換成新前綴。
 * prefix 可以是函式（有序清單要依序編號）。
 */
export function toggleLinePrefix(
  ed: Editor,
  pattern: RegExp,
  prefix: string | ((index: number) => string),
  /** 同類但不同的前綴（例如 ## 切到 ###）要先清掉 */
  clearPattern: RegExp = pattern
) {
  const model = ed.getModel()
  if (!model || !ed.getSelection()) return
  const { start, end } = selectedLineRange(ed)
  const make = typeof prefix === 'function' ? prefix : () => prefix

  const lines: number[] = []
  for (let n = start; n <= end; n++) lines.push(n)
  const contentLines = lines.filter((n) => model.getLineContent(n).trim() !== '')
  const target = contentLines.length ? contentLines : lines
  const allHave = target.every((n) => pattern.test(model.getLineContent(n)))

  const edits = target.map((n, i) => {
    const line = model.getLineContent(n)
    const existing = clearPattern.exec(line)?.[0] ?? ''
    const indent = /^\s*/.exec(line)![0]
    const rest = line.slice(Math.max(existing.length, indent.length))
    const text = allHave ? `${indent}${rest}` : `${indent}${make(i)}${rest}`
    return {
      range: { startLineNumber: n, startColumn: 1, endLineNumber: n, endColumn: line.length + 1 },
      text,
    }
  })
  ed.executeEdits('md-prefix', edits)
  ed.focus()
}

const HEADING = /^\s*#{1,6}\s+/
const LIST = /^\s*(?:[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)/

export function setHeading(ed: Editor, level: 0 | 1 | 2 | 3 | 4 | 5 | 6) {
  const model = ed.getModel()
  if (!model || !ed.getSelection()) return
  const { start, end } = selectedLineRange(ed)
  const hashes = '#'.repeat(level)
  // 已經是同一級 → 取消標題
  const same = (n: number) => new RegExp(`^\\s*${hashes}\\s+`).test(model.getLineContent(n)) && !new RegExp(`^\\s*${hashes}#`).test(model.getLineContent(n))
  let allSame = level > 0
  for (let n = start; n <= end; n++) allSame &&= same(n)

  const edits = []
  for (let n = start; n <= end; n++) {
    const line = model.getLineContent(n)
    const rest = line.replace(HEADING, '')
    const text = allSame || level === 0 ? rest : `${hashes} ${rest}`
    edits.push({ range: { startLineNumber: n, startColumn: 1, endLineNumber: n, endColumn: line.length + 1 }, text })
  }
  ed.executeEdits('md-heading', edits)
  ed.focus()
}

export const toggleQuote = (ed: Editor) => toggleLinePrefix(ed, /^\s*>\s?/, '> ')
export const toggleBulletList = (ed: Editor) => toggleLinePrefix(ed, /^\s*[-*+]\s+(?!\[[ xX]\])/, '- ', LIST)
export const toggleTaskList = (ed: Editor) => toggleLinePrefix(ed, /^\s*[-*+]\s+\[[ xX]\]\s+/, '- [ ] ', LIST)
export const toggleOrderedList = (ed: Editor) =>
  toggleLinePrefix(ed, /^\s*\d+[.)]\s+/, (i) => `${i + 1}. `, LIST)

/**
 * 以獨立區塊插入（前後自動補空行），snippet 裡的 $0 是插入後游標位置；
 * 有選取文字時，$0 會被選取文字取代（例如把一段字包進 <Alert>）。
 */
export function insertBlock(ed: Editor, snippet: string) {
  const model = ed.getModel()
  const sel = ed.getSelection()
  if (!model || !sel) return

  const selected = model.getValueInRange(sel)
  let text = snippet
  if (selected) text = text.replace(CURSOR, () => selected)

  const lineBefore = model.getLineContent(sel.startLineNumber).slice(0, sel.startColumn - 1)
  const lineAfter = model.getLineContent(sel.endLineNumber).slice(sel.endColumn - 1)
  const prevLine = sel.startLineNumber > 1 ? model.getLineContent(sel.startLineNumber - 1) : ''
  const pre = lineBefore.trim() ? '\n\n' : prevLine.trim() && !lineBefore ? '\n' : ''
  const post = lineAfter.trim() ? '\n\n' : '\n'
  text = `${pre}${text}${post}`

  const cursorOffset = text.indexOf(CURSOR)
  const clean = text.replace(CURSOR, '')
  ed.executeEdits('md-block', [{ range: sel, text: clean, forceMoveMarkers: true }])

  const startOffset = model.getOffsetAt({ lineNumber: sel.startLineNumber, column: sel.startColumn })
  const pos = model.getPositionAt(startOffset + (cursorOffset >= 0 ? cursorOffset : clean.length - post.length))
  ed.setPosition(pos)
  ed.revealPositionInCenterIfOutsideViewport(pos)
  ed.focus()
}

/** 在游標處插入行內文字（不補空行），$0 為游標位置 */
export function insertInline(ed: Editor, snippet: string) {
  const model = ed.getModel()
  const sel = ed.getSelection()
  if (!model || !sel) return
  const selected = model.getValueInRange(sel)
  const text = selected ? snippet.replace(CURSOR, () => selected) : snippet
  const cursorOffset = text.indexOf(CURSOR)
  const clean = text.replace(CURSOR, '')
  ed.executeEdits('md-inline', [{ range: sel, text: clean, forceMoveMarkers: true }])
  const startOffset = model.getOffsetAt({ lineNumber: sel.startLineNumber, column: sel.startColumn })
  ed.setPosition(model.getPositionAt(startOffset + (cursorOffset >= 0 ? cursorOffset : clean.length)))
  ed.focus()
}

export function insertLink(ed: Editor) {
  const model = ed.getModel()
  const sel = ed.getSelection()
  if (!model || !sel) return
  const text = model.getValueInRange(sel)
  if (/^https?:\/\/\S+$/.test(text)) {
    // 選到的是網址 → 當成連結目標，游標停在文字處
    ed.executeEdits('md-link', [{ range: sel, text: `[](${text})`, forceMoveMarkers: true }])
    ed.setPosition({ lineNumber: sel.startLineNumber, column: sel.startColumn + 1 })
    ed.focus()
    return
  }
  ed.executeEdits('md-link', [{ range: sel, text: `[${text || '連結文字'}](https://)`, forceMoveMarkers: true }])
  // 選起 https:// 讓使用者直接貼上網址
  const urlStart = sel.startColumn + (text || '連結文字').length + 3
  if (!text.includes('\n')) {
    ed.setSelection({ startLineNumber: sel.startLineNumber, startColumn: urlStart, endLineNumber: sel.startLineNumber, endColumn: urlStart + 8 })
  }
  ed.focus()
}

export function insertTable(ed: Editor, cols = 3, rows = 2) {
  const header = `| ${Array.from({ length: cols }, (_, i) => (i === 0 ? '$0欄位 1' : `欄位 ${i + 1}`)).join(' | ')} |`
  const divider = `| ${Array.from({ length: cols }, () => '---').join(' | ')} |`
  const row = `| ${Array.from({ length: cols }, () => '   ').join(' | ')} |`
  insertBlock(ed, [header, divider, ...Array.from({ length: rows }, () => row)].join('\n'))
}

/**
 * 插入圖片佔位字串、上傳完成後換成真正的網址。多張圖會依序排在游標處。
 * 回傳 Promise 讓呼叫端可以等全部上傳完。
 */
export async function uploadImages(ed: Editor, files: File[], upload: (file: File) => Promise<string>) {
  const images = files.filter((f) => f.type.startsWith('image/'))
  await Promise.all(
    images.map((file) => {
      const token = `![上傳中…](uploading-${crypto.randomUUID()})`
      insertInline(ed, `${token}\n`)
      return upload(file)
        .then((url) => replaceToken(ed, token, `![${file.name.replace(/\.[^.]+$/, '')}](${url})`))
        .catch(() => replaceToken(ed, `${token}\n`, ''))
    })
  )
}

export function replaceToken(ed: Editor, token: string, replacement: string) {
  const model = ed.getModel()
  const match = model?.findMatches(token, false, false, true, null, false)[0]
  if (!match) return
  ed.executeEdits('md-token', [{ range: match.range, text: replacement, forceMoveMarkers: true }])
}

/**
 * Enter 時延續清單 / 引用：
 * - 「- 項目」→ 下一行自動補「- 」（有序清單自動 +1、待辦清單補「- [ ] 」）
 * - 空的清單項按 Enter → 移除符號，跳出清單
 * 回傳 false 代表這行不是清單，交給預設的換行處理。
 */
export function continueList(ed: Editor): boolean {
  const model = ed.getModel()
  const sel = ed.getSelection()
  if (!model || !sel || !sel.isEmpty()) return false

  const line = model.getLineContent(sel.startLineNumber)
  const m = /^(\s*)(?:([-*+])\s+(\[[ xX]\]\s+)?|(\d+)([.)])\s+|(>\s?))/.exec(line)
  if (!m) return false
  // 游標在前綴裡面就不處理
  if (sel.startColumn <= m[0].length) return false

  const [prefix, indent, bullet, task, num, numSep, quote] = m
  if (line.trim() === prefix.trim()) {
    // 空項目 → 清掉符號，結束清單
    ed.executeEdits('md-list', [
      { range: { startLineNumber: sel.startLineNumber, startColumn: 1, endLineNumber: sel.startLineNumber, endColumn: line.length + 1 }, text: '' },
    ])
    return true
  }

  const next = bullet
    ? `${indent}${bullet} ${task ? '[ ] ' : ''}`
    : num
      ? `${indent}${Number(num) + 1}${numSep} `
      : `${indent}${quote}`
  ed.executeEdits('md-list', [{ range: sel, text: `\n${next}`, forceMoveMarkers: true }])
  ed.revealPosition(ed.getPosition()!)
  return true
}
