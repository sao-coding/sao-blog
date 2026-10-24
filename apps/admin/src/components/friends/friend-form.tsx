'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@sao-blog/ui/components/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@sao-blog/ui/components/field'
import { Input } from '@sao-blog/ui/components/input'
import { Switch } from '@sao-blog/ui/components/switch'
import { Textarea } from '@sao-blog/ui/components/textarea'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { orpc } from '@/utils/orpc'
import type { Friend } from './friends-columns'
import { invalidateFriends } from './friends-row-actions'

interface FriendFormProps {
  mode: 'create' | 'edit'
  friend?: Friend
  onSuccess?: () => void
  onCancel?: () => void
}

type TextKey = 'name' | 'url' | 'avatar' | 'email' | 'feedUrl' | 'backlinkUrl' | 'group'

export function FriendForm({ mode, friend, onSuccess, onCancel }: FriendFormProps) {
  const isEditMode = mode === 'edit'
  const [values, setValues] = useState({
    name: friend?.name ?? '',
    url: friend?.url ?? '',
    avatar: friend?.avatar ?? '',
    description: friend?.description ?? '',
    email: friend?.email ?? '',
    feedUrl: friend?.feedUrl ?? '',
    backlinkUrl: friend?.backlinkUrl ?? '',
    circleEnabled: friend?.circleEnabled ?? true,
    group: friend?.group ?? 'friend',
    sortOrder: friend?.sortOrder ?? 0,
    reviewNote: friend?.reviewNote ?? '',
  })
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const createMutation = useMutation(orpc.admin.friend.createFriend.mutationOptions())
  const updateMutation = useMutation(orpc.admin.friend.updateFriend.mutationOptions())
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.name.trim() || !values.url.trim() || !values.group.trim()) {
      toast.error('名稱、網址與分組為必填')
      return
    }
    try {
      const res =
        isEditMode && friend
          ? await updateMutation.mutateAsync({ ...values, id: friend.id })
          : await createMutation.mutateAsync(values)
      if (res.status !== 'success') {
        toast.error(res.message)
        return
      }
      await invalidateFriends()
      toast.success(res.message)
      onSuccess?.()
    } catch {
      toast.error('儲存失敗，請稍後再試。')
    }
  }

  const textField = (key: TextKey, label: string, placeholder?: string) => (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input value={values[key]} placeholder={placeholder} onChange={(e) => set(key, e.target.value)} />
    </Field>
  )

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <FieldGroup className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {textField('name', '名稱')}
          {textField('url', '網址', 'https://example.com')}
          {textField('avatar', '頭像網址')}
          {textField('email', 'Email')}
        </div>
        <Field>
          <FieldLabel>介紹</FieldLabel>
          <Input value={values.description} maxLength={200} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {textField('feedUrl', 'RSS / Atom 網址', '留空則自動發現')}
          {textField('backlinkUrl', '對方的友鏈頁')}
          {textField('group', '分組')}
          <Field>
            <FieldLabel>排序</FieldLabel>
            <Input
              type="number"
              value={values.sortOrder}
              onChange={(e) => set('sortOrder', Number(e.target.value) || 0)}
            />
          </Field>
        </div>
        <Field orientation="horizontal">
          <Switch checked={values.circleEnabled} onCheckedChange={(v) => set('circleEnabled', Boolean(v))} />
          <div>
            <FieldLabel>加入朋友圈</FieldLabel>
            <FieldDescription>聚合器會抓這個站的 RSS，顯示在朋友圈。</FieldDescription>
          </div>
        </Field>
        <Field>
          <FieldLabel>備註</FieldLabel>
          <Textarea rows={2} value={values.reviewNote} onChange={(e) => set('reviewNote', e.target.value)} />
        </Field>
      </FieldGroup>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          取消
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              儲存中...
            </>
          ) : isEditMode ? (
            '儲存變更'
          ) : (
            '新增友鏈'
          )}
        </Button>
      </div>
    </form>
  )
}
