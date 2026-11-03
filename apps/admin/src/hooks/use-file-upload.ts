'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { orpc, queryClient } from '@/utils/orpc'

/**
 * 共用檔案上傳邏輯：檔案管理頁與編輯器貼圖上傳都透過這個 hook 呼叫同一個上傳 API。
 */
export function useFileUpload() {
  const mutation = useMutation(orpc.admin.file.uploadFile.mutationOptions())

  const uploadFile = async (file: File): Promise<string> => {
    const result = await mutation.mutateAsync({ file })
    if (result.status === 'error') {
      toast.error(result.message)
      throw new Error(result.message)
    }
    await queryClient.invalidateQueries({
      queryKey: orpc.admin.file.getFiles.queryOptions({ input: {} }).queryKey,
    })
    return result.data.url
  }

  return { uploadFile, isUploading: mutation.isPending }
}
