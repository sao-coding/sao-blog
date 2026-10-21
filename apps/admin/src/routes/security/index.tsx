import { useEffect, useState, type ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from 'lucide-react'
import AdminShell from '@/components/layout/admin-shell'
import { orpc, queryClient } from '@/utils/orpc'
import { Button } from '@sao-blog/ui/components/button'
import { Input } from '@sao-blog/ui/components/input'
import { Label } from '@sao-blog/ui/components/label'
import { Switch } from '@sao-blog/ui/components/switch'
import { Badge } from '@sao-blog/ui/components/badge'
import { Skeleton } from '@sao-blog/ui/components/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sao-blog/ui/components/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sao-blog/ui/components/select'
import { cn } from '@sao-blog/ui/lib/utils'
import type { InferClientOutputs } from '@orpc/client'
import type { client } from '@/utils/orpc'

export const Route = createFileRoute('/security/')({
  component: RouteComponent,
})

type Outputs = InferClientOutputs<typeof client>
type Settings = Outputs['admin']['security']['getSettings']['data']['settings']

const MODES: { value: Settings['moderation']['mode']; title: string; description: string }[] = [
  { value: 'trusted', title: '信任制（建議）', description: '曾有留言通過、且帳號夠舊的人自動公開；第一次留言或新帳號先待審。' },
  { value: 'all', title: '全部審核', description: '每則留言都要你通過才會公開。' },
  { value: 'none', title: '不審核', description: '直接公開，只靠下面的過濾與限流擋垃圾。' },
]

const RATE_FIELDS: { key: keyof Settings['rateLimit']; label: string; unit: string }[] = [
  { key: 'commentPerUserPerMinute', label: '每位使用者每分鐘留言', unit: '則' },
  { key: 'commentPerUserPerHour', label: '每位使用者每小時留言', unit: '則' },
  { key: 'commentPerIpPerMinute', label: '每個 IP 每分鐘留言', unit: '則' },
  { key: 'commentPerIpPerHour', label: '每個 IP 每小時留言', unit: '則' },
  { key: 'likePerUserPerMinute', label: '每位使用者每分鐘按讚', unit: '次' },
  { key: 'signInPerIpPerMinute', label: '每個 IP 每分鐘帳密登入', unit: '次' },
]

const BLOCK_TYPES = { ip: 'IP', email: 'Email', keyword: '關鍵字' } as const

function RouteComponent() {
  const { data, status } = useQuery(orpc.admin.security.getSettings.queryOptions())
  const [draft, setDraft] = useState<Settings | null>(null)

  useEffect(() => {
    if (data?.data) setDraft(data.data.settings)
  }, [data])

  const saveMutation = useMutation(orpc.admin.security.saveSettings.mutationOptions())
  const dirty = Boolean(draft && data?.data && JSON.stringify(draft) !== JSON.stringify(data.data.settings))

  const save = async () => {
    if (!draft) return
    try {
      const res = await saveMutation.mutateAsync(draft)
      await queryClient.invalidateQueries({ queryKey: orpc.admin.security.key() })
      toast.success(res.message)
    } catch {
      toast.error('儲存失敗，請檢查數值是否在合理範圍內。')
    }
  }

  const set = <S extends keyof Settings>(section: S, patch: Partial<Settings[S]>) =>
    setDraft((d) => (d ? { ...d, [section]: { ...d[section], ...patch } } : d))

  const integrations = data?.data?.integrations

  return (
    <AdminShell
      title="安全設定"
      description="留言審核、內容過濾、限流與封鎖清單。儲存後約 30 秒內生效，不需要重新部署。"
      actions={
        <Button onClick={save} disabled={!dirty || saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          {dirty ? '儲存設定' : '已儲存'}
        </Button>
      }
    >
      {status === 'pending' || !draft ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>審核模式</CardTitle>
              <CardDescription>管理員自己的留言一律直接公開，不受審核、過濾與限流影響。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="審核模式">
                {MODES.map((mode) => {
                  const active = draft.moderation.mode === mode.value
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => set('moderation', { mode: mode.value })}
                      className={cn(
                        'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors',
                        active ? 'border-primary/60 bg-primary/10' : 'hover:bg-muted/50'
                      )}
                    >
                      <span className="text-sm font-medium">{mode.title}</span>
                      <span className="text-xs text-muted-foreground">{mode.description}</span>
                    </button>
                  )
                })}
              </div>
              {draft.moderation.mode === 'trusted' && (
                <NumberField
                  id="newAccountHours"
                  label="新帳號觀察期"
                  hint="註冊未滿這個時數的帳號，留言一律待審"
                  unit="小時"
                  value={draft.moderation.newAccountHours}
                  onChange={(v) => set('moderation', { newAccountHours: v })}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>內容過濾</CardTitle>
              <CardDescription>命中的留言會標成「垃圾」，留言者看到的訊息跟待審一樣，不會知道被擋。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchField
                label="蜜罐欄位"
                hint="表單裡藏一個看不見的欄位，機器人填了就直接丟掉"
                checked={draft.filters.honeypot}
                onChange={(v) => set('filters', { honeypot: v })}
              />
              <SwitchField
                label="Cloudflare Turnstile"
                hint={integrations?.turnstile ? '留言前要通過人機驗證' : '伺服器尚未設定 TURNSTILE_SECRET_KEY，開啟也不會生效'}
                checked={draft.filters.turnstile}
                onChange={(v) => set('filters', { turnstile: v })}
              />
              <NumberField
                id="maxLinks"
                label="連結上限"
                hint="超過就標為垃圾，0 表示不限制"
                unit="個"
                value={draft.filters.maxLinks}
                onChange={(v) => set('filters', { maxLinks: v })}
              />
              <NumberField
                id="duplicateWindowHours"
                label="重複內容檢查"
                hint="同一人在這段時間內貼一樣的內容會被擋，0 表示不檢查"
                unit="小時"
                value={draft.filters.duplicateWindowHours}
                onChange={(v) => set('filters', { duplicateWindowHours: v })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>限流</CardTitle>
              <CardDescription>超過時會請對方稍後再試。目前存在伺服器記憶體裡，重啟後會重新計算。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {RATE_FIELDS.map((f) => (
                <NumberField
                  key={f.key}
                  id={f.key}
                  label={f.label}
                  unit={f.unit}
                  value={draft.rateLimit[f.key]}
                  onChange={(v) => set('rateLimit', { [f.key]: v } as Partial<Settings['rateLimit']>)}
                />
              ))}
              <p className="text-xs text-muted-foreground">帳密登入限流只在正式環境啟用（better-auth 預設）。</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>伺服器整合</CardTitle>
              <CardDescription>這些需要在伺服器的環境變數設定，這裡只顯示狀態。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <IntegrationItem
                ok={integrations?.turnstile}
                title="Cloudflare Turnstile"
                detail={integrations?.turnstile ? '已設定' : 'TURNSTILE_SECRET_KEY 未設定'}
              />
              <IntegrationItem
                ok={integrations?.geoip}
                title="GeoLite2 歸屬地"
                detail={integrations?.geoip ? '已設定，每天檢查更新' : 'MAXMIND_ACCOUNT_ID / LICENSE_KEY 未設定'}
              />
              <IntegrationItem ok title="真實 IP 標頭" detail={integrations?.clientIpHeader ?? '—'} />
              <IntegrationItem
                ok={integrations?.clientIpHeader !== 'x-forwarded-for' || (integrations?.trustedProxies ?? 0) > 0}
                title="信任的代理"
                detail={
                  (integrations?.trustedProxies ?? 0) > 0
                    ? `${integrations?.trustedProxies} 組`
                    : integrations?.clientIpHeader === 'x-forwarded-for'
                      ? '未設定 TRUSTED_PROXIES（取最右邊的位址）'
                      : '不需要'
                }
              />
            </CardContent>
          </Card>

          <BlocklistCard />
        </div>
      )}
    </AdminShell>
  )
}

function NumberField({
  id,
  label,
  hint,
  unit,
  value,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  unit: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id}>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Input
          id={id}
          type="number"
          min={0}
          inputMode="numeric"
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(0, Math.floor(Number(e.target.value))))}
          className="w-20 text-right tabular-nums"
        />
        <span className="min-w-6 whitespace-nowrap text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}

function SwitchField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: ReactNode
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
    </label>
  )
}

function IntegrationItem({ ok, title, detail }: { ok?: boolean; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border p-3">
      {ok ? (
        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-400" />
      ) : (
        <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="truncate text-xs text-muted-foreground" title={detail}>
          {detail}
        </div>
      </div>
    </div>
  )
}

function BlocklistCard() {
  const { data, status } = useQuery(orpc.admin.security.getBlocklist.queryOptions())
  const addMutation = useMutation(orpc.admin.security.addBlock.mutationOptions())
  const removeMutation = useMutation(orpc.admin.security.removeBlock.mutationOptions())
  const [type, setType] = useState<keyof typeof BLOCK_TYPES>('keyword')
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')

  const refresh = () => queryClient.invalidateQueries({ queryKey: orpc.admin.security.getBlocklist.key() })

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    const res = await addMutation.mutateAsync({ type, value, note: note || undefined })
    if (res.status !== 'success') {
      toast.error(res.message)
      return
    }
    setValue('')
    setNote('')
    await refresh()
    toast.success(res.message)
  }

  const remove = async (id: string) => {
    const res = await removeMutation.mutateAsync({ id })
    await refresh()
    if (res.status === 'success') toast.success(res.message)
    else toast.error(res.message)
  }

  const rows = data?.data ?? []

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>封鎖清單</CardTitle>
        <CardDescription>
          IP 與 Email 會直接擋下留言；關鍵字（不分大小寫）命中時標成垃圾。也可以在留言列表的「⋯」一鍵封鎖。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
          <Select value={type} onValueChange={(v) => setType(v as keyof typeof BLOCK_TYPES)}>
            <SelectTrigger className="sm:w-28" aria-label="類型">
              <SelectValue>{BLOCK_TYPES[type]}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {Object.entries(BLOCK_TYPES).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === 'ip' ? '203.0.113.7' : type === 'email' ? 'spam@example.com' : '例如：加我賴'}
            className="sm:flex-1"
            aria-label="封鎖值"
          />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="備註（選填）" className="sm:w-48" aria-label="備註" />
          <Button type="submit" disabled={!value.trim() || addMutation.isPending}>
            <PlusIcon />
            加入
          </Button>
        </form>

        {status === 'pending' ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : rows.length === 0 ? (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">封鎖清單是空的</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-3 py-2">
                <Badge variant="outline" className="w-16 justify-center">
                  {BLOCK_TYPES[row.type]}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-sm">{row.value}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {row.note ? `${row.note} · ` : ''}
                    {dayjs(row.createdAt).format('YYYY-MM-DD HH:mm')}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`移除 ${row.value}`}
                  onClick={() => remove(row.id)}
                  disabled={removeMutation.isPending}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
