import { columns, STATUS_META, type Friend, type FriendStatus } from '@/components/friends/friends-columns'
import { FriendForm } from '@/components/friends/friend-form'
import { invalidateFriends } from '@/components/friends/friends-row-actions'
import AdminShell from '@/components/layout/admin-shell'
import { DataTableContainer } from '@/components/table/table'
import { useOverlay } from '@/hooks/use-overlay'
import { orpc } from '@/utils/orpc'
import { Button } from '@sao-blog/ui/components/button'
import { cn } from '@sao-blog/ui/lib/utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CheckIcon, EyeOffIcon, PlusIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

const searchSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'hidden']).optional(),
})

export const Route = createFileRoute('/friends/')({
  validateSearch: searchSchema,
  component: RouteComponent,
})

// 分頁順序：待審放第一個，打開就是要處理的東西
const TABS: { value: FriendStatus | undefined; label: string }[] = [
  { value: 'pending', label: STATUS_META.pending.label },
  { value: 'approved', label: STATUS_META.approved.label },
  { value: 'hidden', label: STATUS_META.hidden.label },
  { value: 'rejected', label: STATUS_META.rejected.label },
  { value: undefined, label: '全部' },
]

function RouteComponent() {
  const { status } = Route.useSearch()
  const navigate = useNavigate()
  const { openDialog } = useOverlay()

  const { data: friends, status: queryStatus } = useQuery(
    orpc.admin.friend.getFriends.queryOptions({ input: { status } })
  )
  const { data: countsRes } = useQuery(orpc.admin.friend.getStatusCounts.queryOptions())
  const counts = countsRes?.data
  const total = counts ? counts.pending + counts.approved + counts.rejected + counts.hidden : undefined

  const statusMutation = useMutation(orpc.admin.friend.setFriendStatus.mutationOptions())
  const batchSetStatus = async (rows: Friend[], next: FriendStatus, clear: () => void) => {
    try {
      const res = await statusMutation.mutateAsync({ ids: rows.map((r) => r.id), status: next })
      await invalidateFriends()
      clear()
      toast.success(res.message)
    } catch {
      toast.error('操作失敗，請稍後再試。')
    }
  }

  const openCreateDialog = () => {
    openDialog({
      id: 'create-friend',
      render: ({ close }) => ({
        title: '新增友鏈',
        description: '後台新增的友鏈直接視為已通過。',
        body: <FriendForm mode="create" onSuccess={close} onCancel={close} />,
        hideCancel: true,
        hideConfirm: true,
      }),
    })
  }

  return (
    <AdminShell
      title="友鏈"
      description="審核友鏈申請。通過且勾選「加入朋友圈」的站，聚合器會抓它的 RSS。"
      actions={
        <Button onClick={openCreateDialog} className="gap-2">
          <PlusIcon className="size-4" />
          新增友鏈
        </Button>
      }
    >
      <div className="space-y-3">
        {/* 狀態分頁 */}
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {TABS.map((tab) => {
            const n = tab.value ? counts?.[tab.value] : total
            const active = status === tab.value
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => navigate({ to: '/friends', search: { status: tab.value } })}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  active ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-transparent text-muted-foreground hover:bg-muted'
                )}
              >
                {tab.label}
                {n !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs tabular-nums',
                      tab.value === 'pending' && n > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {n}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <DataTableContainer
          columns={columns}
          data={friends?.data || []}
          searchColumnId="name"
          isLoading={queryStatus === 'pending'}
          emptyDescription={status === 'pending' ? '沒有待審的友鏈申請。' : undefined}
          renderBatchActions={(rows, clear) => (
            <>
              {status !== 'approved' && (
                <Button size="sm" onClick={() => batchSetStatus(rows, 'approved', clear)} disabled={statusMutation.isPending}>
                  <CheckIcon />
                  通過 {rows.length} 個
                </Button>
              )}
              {status === 'pending' && (
                <Button size="sm" variant="outline" onClick={() => batchSetStatus(rows, 'rejected', clear)} disabled={statusMutation.isPending}>
                  <XIcon />
                  拒絕
                </Button>
              )}
              {status === 'approved' && (
                <Button size="sm" variant="outline" onClick={() => batchSetStatus(rows, 'hidden', clear)} disabled={statusMutation.isPending}>
                  <EyeOffIcon />
                  下架
                </Button>
              )}
            </>
          )}
        />
      </div>
    </AdminShell>
  )
}
