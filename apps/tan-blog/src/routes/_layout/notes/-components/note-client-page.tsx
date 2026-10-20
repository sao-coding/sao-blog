import { useEffect, useRef, type ReactNode } from 'react'
import { NoteMainContainer } from './note-main-container'
import TableOfContent from '@/components/toc'
import type { NoteItem } from '@/types/note'
import type { TocItem } from '@/types/toc'
import { useHeaderStore } from '@/store/header-store'
import { CommentSection } from '@/components/comment'
import { NoteHeader } from './note-header'
import { LetterPaper, LetterSignature } from '@/components/letter-paper'

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

  return (
    <>
      <div>
        {/* 日記也是一張信箋：寫作當時季節的花木與落款 */}
        <LetterPaper date={note.createdAt} className="note-card-enter">
          <div ref={targetRef}>
            <NoteHeader note={note} />
            <NoteMainContainer>
              <article className="prose dark:prose-invert max-w-full mt-10 note-content">
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
