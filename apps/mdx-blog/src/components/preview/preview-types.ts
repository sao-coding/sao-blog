import type { SerializeResult } from 'next-mdx-remote-client/serialize'

export type PreviewKind = 'post' | 'note'

export interface PreviewMeta {
  title: string
  href: string
  kindLabel: string
  cover: string | null
  category: string | null
  mood: string | null
  weather: string | null
  createdAt: string | null
}

export type PreviewResult =
  | {
      ok: true
      serialized: SerializeResult
      meta: PreviewMeta
    }
  | { ok: false; message: string }
