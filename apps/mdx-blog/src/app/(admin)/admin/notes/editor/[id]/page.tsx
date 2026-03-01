'use client'

import { use } from 'react'
import NoteEditor from '../../_components/editor/note-editor'
import { useQuery } from '@tanstack/react-query'
import { ApiResponse } from '@/types/api'
import { Note, NoteItem } from '@/types/note'

const NoteEditorByIdPage = ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {
  const { id } = use(params)

  const { data: noteData } = useQuery<ApiResponse<NoteItem>>({
    queryKey: ['note', id],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/notes/${id}`,
        {
          credentials: 'include',
        }
      )
      if (!res.ok) {
        throw new Error('Network response was not ok')
      }
      return res.json()
    },
  })

  return (
    <>
      <NoteEditor noteData={noteData?.data} />
    </>
  )
}

export default NoteEditorByIdPage
