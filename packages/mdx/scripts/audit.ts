// 盤點既有文章 / 日記能否通過 compileMdx（找出用到 JS 表達式、未知元件等需改寫的內容）
// 用法：bun run scripts/audit.ts <server-url>   例：bun run scripts/audit.ts http://localhost:3000
import { compileMdx } from '../src/compile'

const server = process.argv[2] ?? process.env.NEXT_PUBLIC_SERVER_URL
if (!server) throw new Error('請提供 server url')

type Item = { id: string; slug?: string; title: string; content?: string }

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${server}/api${path}`)
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return ((await res.json()) as { data: T }).data
}

let failed = 0
const check = async (kind: 'post' | 'note', label: string, content: string) => {
  const result = await compileMdx(content, { profile: kind })
  if (result.ok) return
  failed++
  console.log(`\n✗ ${kind} ${label}`)
  for (const e of result.errors) console.log(`  ${e.line ?? '?'}:${e.column ?? '?'} ${e.message}`)
}

const posts = await get<Item[]>('/posts')
for (const p of posts) {
  const full = await get<Item>(`/posts/${p.slug ?? p.id}`)
  await check('post', `${p.slug} (${p.title})`, full.content ?? '')
}
const notes = await get<{ id: string }[]>('/notes/ids')
for (const n of notes) {
  const full = await get<Item>(`/notes/${n.id}`)
  await check('note', `${n.id} (${full.title})`, full.content ?? '')
}
console.log(`\n${posts.length} posts, ${notes.length} notes, ${failed} failed`)
