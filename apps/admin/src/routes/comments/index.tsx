import { columns, STATUS_META, type Comment, type CommentStatus } from '@/components/comments/comments-columns'
import { invalidateComments } from '@/components/comments/comments-row-actions'
import AdminShell from '@/components/layout/admin-shell'
import { DataTableContainer } from '@/components/table/table'
import { orpc } from '@/utils/orpc'
import { Button } from '@sao-blog/ui/components/button'
import { cn } from '@sao-blog/ui/lib/utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { CheckIcon, ShieldAlertIcon, ShieldIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

const searchSchema = z.object({
  status: z.enum(['pending', 'approved', 'spam', 'rejected']).optional(),
  user: z.string().optional(),
})

export const Route = createFileRoute('/comments/')({
  validateSearch: searchSchema,
  component: RouteComponent,
})

// 分頁順序：待審放第一個，打開就是要處理的東西
const TABS: { value: CommentStatus | undefined; label: string }[] = [
  { value: 'pending', label: STATUS_META.pending.label },
  { value: 'approved', label: STATUS_META.approved.label },
  { value: 'spam', label: STATUS_META.spam.label },
  { value: 'rejected', label: STATUS_META.rejected.label },
  { value: undefined, label: '全部' },
]

function RouteComponent() {
  const { status, user } = Route.useSearch()
  const navigate = useNavigate()

  const { data: comments, status: queryStatus } = useQuery(
    orpc.admin.comment.getComments.queryOptions({ input: { status, userId: user } })
  )
  const { data: countsRes } = useQuery(orpc.admin.comment.getStatusCounts.queryOptions())
  const counts = countsRes?.data
  const total = counts ? counts.pending + counts.approved + counts.spam + counts.rejected : undefined

  const statusMutation = useMutation(orpc.admin.comment.setCommentStatus.mutationOptions())
  const batchSetStatus = async (rows: Comment[], next: CommentStatus, clear: () => void) => {
    try {
      const res = await statusMutation.mutateAsync({ ids: rows.map((r) => r.id), status: next })
      await invalidateComments()
      clear()
      toast.success(res.message)
    } catch {
      toast.error('操作失敗，請稍後再試。')
    }
  }

  const viewingUser = user ? comments?.data?.[0]?.displayUsername : undefined

  return (
    <AdminShell
      title="留言"
      description="審核讀者留言：第一次留言或新帳號會先進待審，曾經通過的使用者之後自動公開。"
      actions={
        <Button variant="outline" render={<Link to="/security" />} nativeButton={false}>
          <ShieldIcon />
          審核與防護設定
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
                onClick={() => navigate({ to: '/comments', search: { status: tab.value, user } })}
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

        {user && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <span>
              只顯示 <span className="font-medium">{viewingUser ?? '此使用者'}</span> 的留言
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/comments', search: { status } })}>
              <XIcon />
              清除篩選
            </Button>
          </div>
        )}

        <DataTableContainer
          columns={columns}
          data={comments?.data || []}
          searchColumnId="displayUsername"
          isLoading={queryStatus === 'pending'}
          emptyDescription={status === 'pending' ? '沒有待審留言，全部處理完了。' : undefined}
          renderBatchActions={(rows, clear) => (
            <>
              {status !== 'approved' && (
                <Button size="sm" onClick={() => batchSetStatus(rows, 'approved', clear)} disabled={statusMutation.isPending}>
                  <CheckIcon />
                  通過 {rows.length} 則
                </Button>
              )}
              {status !== 'spam' && (
                <Button size="sm" variant="outline" onClick={() => batchSetStatus(rows, 'spam', clear)} disabled={statusMutation.isPending}>
                  <ShieldAlertIcon />
                  垃圾
                </Button>
              )}
              {status !== 'rejected' && (
                <Button size="sm" variant="outline" onClick={() => batchSetStatus(rows, 'rejected', clear)} disabled={statusMutation.isPending}>
                  <XIcon />
                  拒絕
                </Button>
              )}
            </>
          )}
        />
      </div>
    </AdminShell>
  )
}
