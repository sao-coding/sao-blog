'use client'

import { useQuery } from '@tanstack/react-query'
import { ApiResponse } from '@/types/api'
import { NoteItem } from '@/types/note'
import { NotesTableWithActions } from './_components/table/notes-table-with-actions'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import AdminShell from '../../_components/layout/admin-shell'

const NotesPage = () => {
  const { data: notesData, isLoading } = useQuery<ApiResponse<NoteItem[]>>({
    queryKey: ['notes'],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/notes?limit=100`,
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-lg">載入中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AdminShell
      title="日記列表"
      actions={
        <Button render={
          <Link href="/admin/notes/editor">
            <Plus className="h-4 w-4 mr-2" />
            新增日記
          </Link>
        } />
      }
    >
      <div>
        <NotesTableWithActions data={notesData?.data || []} />
      </div>
    </AdminShell>
  )
}

export default NotesPage
