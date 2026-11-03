import { useEffect, useState, type ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2Icon, SaveIcon, SendIcon } from 'lucide-react'
import AdminShell from '@/components/layout/admin-shell'
import { orpc, queryClient } from '@/utils/orpc'
import { Button } from '@sao-blog/ui/components/button'
import { Input } from '@sao-blog/ui/components/input'
import { Label } from '@sao-blog/ui/components/label'
import { Switch } from '@sao-blog/ui/components/switch'
import { Skeleton } from '@sao-blog/ui/components/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sao-blog/ui/components/card'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/utils/orpc'

export const Route = createFileRoute('/settings/')({
  component: RouteComponent,
})

type Outputs = InferClientOutputs<typeof client>
type Data = Outputs['admin']['settings']['getSettings']['data']
type Draft = {
  site: Data['site']
  // 密碼欄位只用來輸入新密碼；留空代表沿用原本的
  mail: Omit<Data['mail'], 'hasPassword'> & { password: string }
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
      <Label className="text-sm">{label}</Label>
      <div className="space-y-1">
        {children}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
    </div>
  )
}

function RouteComponent() {
  const { data, status } = useQuery(orpc.admin.settings.getSettings.queryOptions())
  const [draft, setDraft] = useState<Draft | null>(null)
  const [testTo, setTestTo] = useState('')
  const hasPassword = data?.data.mail.hasPassword ?? false

  useEffect(() => {
    if (!data?.data) return
    const { hasPassword: _, ...mail } = data.data.mail
    setDraft({ site: data.data.site, mail: { ...mail, password: '' } })
    setTestTo((v) => v || data.data.site.ownerEmail)
  }, [data])

  const saveMutation = useMutation(orpc.admin.settings.saveSettings.mutationOptions())
  const testMutation = useMutation(orpc.admin.settings.sendTestMail.mutationOptions())

  const setSite = <K extends keyof Draft['site']>(key: K, value: Draft['site'][K]) =>
    setDraft((d) => (d ? { ...d, site: { ...d.site, [key]: value } } : d))
  const setMail = <K extends keyof Draft['mail']>(key: K, value: Draft['mail'][K]) =>
    setDraft((d) => (d ? { ...d, mail: { ...d.mail, [key]: value } } : d))

  const mailPayload = (d: Draft) => ({ ...d.mail, password: d.mail.password || undefined })

  const save = async () => {
    if (!draft) return
    try {
      const res = await saveMutation.mutateAsync({ site: draft.site, mail: mailPayload(draft) })
      await queryClient.invalidateQueries({ queryKey: orpc.admin.settings.key() })
      toast.success(res.message)
    } catch {
      toast.error('儲存失敗，請確認欄位格式（網址要含 https://、email 要正確）。')
    }
  }

  const sendTest = async () => {
    if (!draft || !testTo) return
    try {
      const res = await testMutation.mutateAsync({ to: testTo, mail: mailPayload(draft) })
      if (res.status === 'success') toast.success(res.message)
      else toast.error(res.message)
    } catch {
      toast.error('寄送失敗，請確認欄位格式。')
    }
  }

  return (
    <AdminShell
      title="網站設定"
      description="網站基本資料與寄信設定，存在資料庫，修改後立即生效（最多 30 秒快取），不需要環境變數或重新部署。"
      actions={
        <Button onClick={save} disabled={!draft || saveMutation.isPending} className="gap-2">
          {saveMutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          儲存
        </Button>
      }
    >
      {status === 'pending' || !draft ? (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>網站</CardTitle>
              <CardDescription>用在信件的標題、署名與連結。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Row label="網站名稱">
                <Input value={draft.site.name} onChange={(e) => setSite('name', e.target.value)} />
              </Row>
              <Row label="前台網址" hint="例如 https://blog.example.com">
                <Input value={draft.site.url} onChange={(e) => setSite('url', e.target.value)} />
              </Row>
              <Row label="後台網址" hint="通知信裡「前往審核」的連結">
                <Input value={draft.site.adminUrl} onChange={(e) => setSite('adminUrl', e.target.value)} />
              </Row>
              <Row label="站長 Email" hint="收友鏈申請等通知">
                <Input type="email" value={draft.site.ownerEmail} onChange={(e) => setSite('ownerEmail', e.target.value)} />
              </Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>寄信（SMTP）</CardTitle>
              <CardDescription>Gmail 請用「應用程式密碼」；Resend、Brevo 等服務也都有 SMTP。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchRow label="啟用寄信" hint="關閉時所有通知信都不會寄出" checked={draft.mail.enabled} onChange={(v) => setMail('enabled', v)} />
              <Row label="SMTP 主機">
                <Input value={draft.mail.host} placeholder="smtp.gmail.com" onChange={(e) => setMail('host', e.target.value)} />
              </Row>
              <Row label="連接埠" hint="465 搭配 SSL；587 關閉 SSL（會自動升級 STARTTLS）">
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    className="w-28"
                    value={draft.mail.port}
                    onChange={(e) => setMail('port', Number(e.target.value) || 0)}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={draft.mail.secure} onCheckedChange={(v) => setMail('secure', Boolean(v))} />
                    SSL
                  </label>
                </div>
              </Row>
              <Row label="帳號">
                <Input value={draft.mail.user} autoComplete="off" onChange={(e) => setMail('user', e.target.value)} />
              </Row>
              <Row label="密碼" hint={hasPassword ? '已設定；留空代表不變更' : undefined}>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={draft.mail.password}
                  placeholder={hasPassword ? '••••••••' : ''}
                  onChange={(e) => setMail('password', e.target.value)}
                />
              </Row>
              <Row label="寄件人名稱" hint="留空則用網站名稱">
                <Input value={draft.mail.fromName} onChange={(e) => setMail('fromName', e.target.value)} />
              </Row>
              <Row label="寄件地址">
                <Input type="email" value={draft.mail.fromAddress} onChange={(e) => setMail('fromAddress', e.target.value)} />
              </Row>

              <div className="space-y-4 border-t pt-4">
                <SwitchRow
                  label="友鏈申請通知站長"
                  hint="寄到上方的站長 Email"
                  checked={draft.mail.notifyOwnerOnFriendApply}
                  onChange={(v) => setMail('notifyOwnerOnFriendApply', v)}
                />
                <SwitchRow
                  label="友鏈審核結果通知申請人"
                  hint="從待審改成通過或拒絕時寄出"
                  checked={draft.mail.notifyApplicantOnReview}
                  onChange={(v) => setMail('notifyApplicantOnReview', v)}
                />
              </div>

              <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center">
                <Input type="email" placeholder="收件地址" value={testTo} onChange={(e) => setTestTo(e.target.value)} className="sm:max-w-xs" />
                <Button variant="outline" onClick={sendTest} disabled={!testTo || testMutation.isPending} className="gap-2">
                  {testMutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
                  用目前的設定寄測試信
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminShell>
  )
}
