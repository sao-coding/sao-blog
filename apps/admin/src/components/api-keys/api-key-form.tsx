'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@sao-blog/ui/components/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@sao-blog/ui/components/field'
import { Input } from '@sao-blog/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sao-blog/ui/components/select'
import { CheckIcon, CopyIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'
import { queryClient } from '@/utils/orpc'
import { apiKeysQueryKey } from './use-api-keys'

interface ApiKeyFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const DAY = 60 * 60 * 24

const EXPIRY_OPTIONS: { value: string; label: string; seconds: number | null }[] =
  [
    { value: 'never', label: '永不過期', seconds: null },
    { value: '7d', label: '7 天', seconds: 7 * DAY },
    { value: '30d', label: '30 天', seconds: 30 * DAY },
    { value: '90d', label: '90 天', seconds: 90 * DAY },
    { value: '365d', label: '1 年', seconds: 365 * DAY },
  ]

export function ApiKeyForm({ onSuccess, onCancel }: ApiKeyFormProps) {
  const [name, setName] = useState('')
  const [expiry, setExpiry] = useState('never')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createApiKeyMutation = useMutation({
    mutationFn: async () => {
      const expiresIn =
        EXPIRY_OPTIONS.find((option) => option.value === expiry)?.seconds ?? null
      const { data, error } = await authClient.apiKey.create({
        name: name.trim() || undefined,
        expiresIn,
      })
      if (error) {
        throw new Error(error.message ?? '建立 API 金鑰失敗')
      }
      return data
    },
  })

  const isSubmitting = createApiKeyMutation.isPending

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const data = await createApiKeyMutation.mutateAsync()
      await queryClient.invalidateQueries({ queryKey: apiKeysQueryKey })
      setCreatedKey(data?.key ?? null)
      toast.success('API 金鑰建立成功！')
    } catch {
      toast.error('建立 API 金鑰時發生錯誤，請稍後再試。')
    }
  }

  const handleCopy = async () => {
    if (!createdKey) return
    await navigator.clipboard.writeText(createdKey)
    setCopied(true)
    toast.success('已複製 API 金鑰')
    setTimeout(() => setCopied(false), 2000)
  }

  if (createdKey) {
    return (
      <div className="space-y-4">
        <FieldDescription>
          請立即複製並妥善保存此金鑰，關閉視窗後將無法再次查看完整金鑰。
        </FieldDescription>
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
          <code className="flex-1 break-all font-mono text-sm">
            {createdKey}
          </code>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleCopy}
            aria-label="複製金鑰"
          >
            {copied ? (
              <CheckIcon className="size-4" />
            ) : (
              <CopyIcon className="size-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-end">
          <Button type="button" onClick={onSuccess}>
            完成
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FieldGroup className="space-y-4">
        <Field>
          <FieldLabel>名稱</FieldLabel>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：行動 App 後端"
          />
          <FieldDescription>用來識別這把金鑰的用途。</FieldDescription>
        </Field>

        <Field>
          <FieldLabel>有效期限</FieldLabel>
          <Select
            value={expiry}
            onValueChange={(value) => setExpiry((value as string) ?? 'never')}
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇有效期限" />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              建立中...
            </>
          ) : (
            '建立金鑰'
          )}
        </Button>
      </div>
    </form>
  )
}
