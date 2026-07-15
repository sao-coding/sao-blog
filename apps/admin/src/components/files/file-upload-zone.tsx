'use client'

import { useRef, useState } from 'react'
import { UploadCloudIcon } from 'lucide-react'
import { cn } from '@sao-blog/ui/lib/utils'
import { useFileUpload } from '@/hooks/use-file-upload'

interface FileUploadZoneProps {
  accept?: string
  onUploaded?: () => void
}

export function FileUploadZone({ accept, onUploaded }: FileUploadZoneProps) {
  const { uploadFile } = useFileUpload()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const filesToUpload = Array.from(fileList)
    setPendingCount((c) => c + filesToUpload.length)

    for (const file of filesToUpload) {
      try {
        await uploadFile(file)
      } catch {
        // 錯誤已由 useFileUpload 顯示 toast
      } finally {
        setPendingCount((c) => Math.max(0, c - 1))
      }
    }
    onUploaded?.()
  }

  return (
    <div
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        void handleFiles(e.dataTransfer.files)
      }}
    >
      <UploadCloudIcon className="size-8 text-muted-foreground" />
      <div className="text-sm text-muted-foreground">
        {pendingCount > 0 ? `上傳中... (${pendingCount})` : '拖放檔案到這裡，或點擊選擇檔案'}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
