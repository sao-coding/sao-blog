import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@sao-blog/ui/components/card'
import { Badge } from '@sao-blog/ui/components/badge'
import { Button } from '@sao-blog/ui/components/button'
import { Skeleton } from '@sao-blog/ui/components/skeleton'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { orpc } from '@/utils/orpc'

const LOCALE_LABELS: Record<string, string> = {
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
}

const formatTime = (value: string | null | undefined) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—'

/** 搜尋索引狀態 + 重建索引按鈕 */
export function SearchIndexCard() {
  const queryClient = useQueryClient()
  const statusQuery = useQuery(orpc.admin.search.getStatus.queryOptions())
  const status = statusQuery.data?.data

  const reindex = useMutation(
    orpc.admin.search.reindexAll.mutationOptions({
      onSuccess: (res) => {
        if (res.status === 'success') toast.success(res.message)
        else toast.error(res.message)
      },
      onError: (error) => toast.error(`索引重建失敗：${error.message}`),
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: orpc.admin.search.getStatus.key(),
        }),
    })
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>搜尋索引</CardTitle>
        <CardDescription>
          Typesense 全文搜尋。發布 / 修改 / 刪除內容時會自動同步；同步失敗或 schema 變更時請重建索引。
        </CardDescription>
        <CardAction>
          <Button
            size="sm"
            variant="outline"
            disabled={!status?.enabled || reindex.isPending || status.reindexing}
            onClick={() => reindex.mutate({})}
          >
            {reindex.isPending || status?.reindexing ? '重建中…' : '重建索引'}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {statusQuery.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : !status?.enabled ? (
          <p className="text-muted-foreground">
            搜尋未啟用：伺服器未設定 <code>TYPESENSE_HOST</code> /{' '}
            <code>TYPESENSE_ADMIN_API_KEY</code>。
          </p>
        ) : (
          <>
            {!status.healthy && (
              <p className="text-destructive">{statusQuery.data?.message}</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {status.locales.map((l) => (
                <div key={l.locale} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {LOCALE_LABELS[l.locale] ?? l.locale}
                    </span>
                    <Badge variant={l.collection ? 'secondary' : 'outline'}>
                      {l.documents} 筆
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    建立於 {formatTime(l.builtAt)}
                  </p>
                </div>
              ))}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
              <dt className="text-muted-foreground">最後同步</dt>
              <dd>{formatTime(status.lastSyncAt)}</dd>
              <dt className="text-muted-foreground">最後重建</dt>
              <dd>
                {status.lastReindex
                  ? `${formatTime(status.lastReindex.finishedAt)}（${
                      status.lastReindex.ok
                        ? `成功，${status.lastReindex.documents} 筆`
                        : `失敗：${status.lastReindex.error}`
                    }）`
                  : '—（伺服器重啟後未執行）'}
              </dd>
              {status.lastSyncError && (
                <>
                  <dt className="text-destructive">同步錯誤</dt>
                  <dd className="break-all text-destructive">
                    {status.lastSyncError}
                  </dd>
                </>
              )}
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  )
}
