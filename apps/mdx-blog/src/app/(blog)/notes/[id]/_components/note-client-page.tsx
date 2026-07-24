'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { NoteMainContainer } from './note-main-container'
import TableOfContent from '@/components/toc'
import { NoteItem } from '@/types/note'
import { TocItem } from '@/types/toc'
import { useHeaderStore } from '@/store/header-store'
import { CommentSection } from '@/components/comment'
import { NoteHeader } from '../../_components/note-header'

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
      url: window.location.href,
    })
  }, [note, setNoteState])

  return (
    <>
      <div>
        <div ref={targetRef} className="lg:p-[30px_45px] p-[2rem_1rem] bg-white dark:bg-zinc-900 border-zinc-200/70 dark:border-neutral-800 border note-card-enter">
          <NoteHeader note={note} />
          <NoteMainContainer>
            <article className="prose dark:prose-invert max-w-full mt-10 note-content">
              {children}
            </article>
          </NoteMainContainer>

        </div>
        <CommentSection postId={note.id} lazyLoad />
      </div>
      <div className="relative hidden min-w-0 xl:block mt-[120px]">
        <TableOfContent toc={toc} targetRef={targetRef} />
      </div>
    </>
  )
}
