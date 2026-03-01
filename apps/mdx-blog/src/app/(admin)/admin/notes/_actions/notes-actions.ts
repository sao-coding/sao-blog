'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { noteSchema } from '@/schemas/note'
import { cookies, headers } from 'next/headers'

/**
 * Server action to revalidate the notes tag.
 * Exported from a server file so it can be imported into client components.
 */
export async function notesUpdate() {
  console.log('Server action: revalidating notes')
  revalidateTag('notes')
  revalidateTag('topics')
}

/**
 * Server action to create a new note
 */
export async function createNote(noteData: z.infer<typeof noteSchema>) {
  const cookieStore = await cookies()
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/notes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: cookieStore.toString(),
        },
        body: JSON.stringify(noteData),
      }
    )

    if (!response.ok) {
      console.log('Create note failed with status:', noteData)
      console.log('Create note response:', await response.text())
      throw new Error('Failed to create note')
    }

    const result = await response.json()

    // 成功後重新驗證標籤以更新列表
    await notesUpdate()

    return { success: true, data: result }
  } catch (error) {
    console.error('Failed to create note:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Server action to update an existing note
 */
export async function updateNote(
  noteId: string,
  noteData: z.infer<typeof noteSchema>
) {
  const cookieStore = await cookies()
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/notes/${noteId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          cookie: cookieStore.toString(),
        },
        body: JSON.stringify(noteData),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to update note')
    }

    const result = await response.json()

    // 成功後重新驗證標籤以更新列表
    await notesUpdate()

    return { success: true, data: result }
  } catch (error) {
    console.error('Failed to update note:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Server action to delete a single note
 */
export async function deleteNote(noteId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/notes/${noteId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    )

    if (!response.ok) {
      throw new Error('Failed to delete note')
    }

    // 成功後重新驗證標籤以更新列表
    await notesUpdate()

    return { success: true }
  } catch (error) {
    console.error('Failed to delete note:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Server action to delete multiple notes
 */
export async function deleteNotes(noteIds: string[]) {
  try {
    // 這裡需要根據你的 API 實現來調整
    // 假設有一個批量刪除的 API endpoint
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/notes/batch-delete`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ids: noteIds }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to delete notes')
    }

    // 成功後重新驗證標籤以更新列表
    await notesUpdate()

    return { success: true }
  } catch (error) {
    console.error('Failed to delete notes:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
