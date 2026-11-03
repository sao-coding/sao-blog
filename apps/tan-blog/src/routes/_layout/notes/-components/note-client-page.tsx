import { useEffect, useRef, type ReactNode } from 'react'
import { NoteMainContainer } from './note-main-container'
import TableOfContent from '@/components/toc'
import type { NoteItem } from '@/types/note'
import type { TocItem } from '@/types/toc'
import { useHeaderStore } from '@/store/header-store'
import { CommentSection } from '@/components/comment'
import { NoteHeader } from './note-header'
import { LetterPaper, LetterSignature } from '@/components/letter-paper'
import { rememberAnchor } from '@/lib/page-transition'

interface NoteClientPageProps {
  note: NoteItem
  toc: TocItem[]
  children: ReactNode
}

export function NoteClientPage({ note, toc, children }: NoteClientPageProps) {
  const targetRef = useRef<HTMLDivElement>(null)
  const { setNoteState } = useHeaderStore()

  useEffect(() => {
    setNoteState({
      topic: note.topic?.name || '',
      title: note.title,
      url: typeof window !== 'undefined' ? window.location.href : '',
    })
  }, [note, setNoteState])

  // 回到列表時，標題要移回這一篇那一列
  useEffect(() => rememberAnchor(`/notes/${note.id}`), [note.id])

  return (
    <>
      <div>
        {/* 信箋只留朱色箋框與落款的朱印（letter-paper.tsx）；跟文章頁一樣從頁頂 120px 起 */}
        <LetterPaper className="mt-[78px] mb-12">
          <div ref={targetRef}>
            <NoteHeader note={note} anchor={`/notes/${note.id}`} />
            <NoteMainContainer>
              <article className="prose dark:prose-invert max-w-full mt-8 note-content">
                {children}
              </article>
            </NoteMainContainer>
          </div>
          <LetterSignature date={note.createdAt} />
        </LetterPaper>
        <CommentSection postId={note.id} lazyLoad />
      </div>
      <div className="relative hidden min-w-0 xl:block mt-[120px]">
        <TableOfContent toc={toc} targetRef={targetRef} />
      </div>
    </>
  )
}
