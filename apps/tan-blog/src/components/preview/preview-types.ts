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
      serialized: { compiledSource: string }
      meta: PreviewMeta
    }
  | { ok: false; message: string }
