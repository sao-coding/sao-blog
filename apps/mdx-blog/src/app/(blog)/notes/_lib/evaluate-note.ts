import { evaluate } from 'next-mdx-remote-client/rsc'
import { getBasicMdxOptions } from '@/components/mdx/parsers'
import { components } from '@/components/mdx/mdx-renderer'
import { TocItem } from '@/types/toc'

export type NoteScope = {
  readingTime: string
  toc?: TocItem[]
}

export type NoteFrontmatter = {
  title: string
  description?: string
  keywords?: string
  author: string
  date?: string
  showToc?: boolean
}

export const evaluateNoteContent = (source: string) =>
  evaluate<NoteFrontmatter, NoteScope>({
    source,
    options: getBasicMdxOptions(source),
    components,
  })
