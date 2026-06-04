import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import AdminShell from '@/components/layout/admin-shell'
import { StatCards } from '@/components/dashboard/stat-cards'
import { CommentTrendChart } from '@/components/dashboard/comment-trend-chart'
import { CountBarChart } from '@/components/dashboard/count-bar-chart'
import { RecentCommentsList } from '@/components/dashboard/recent-comments-list'
import { RecentUsersList } from '@/components/dashboard/recent-users-list'
import { orpc } from '@/utils/orpc'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const { data, status } = useQuery(
    orpc.admin.dashboard.getOverview.queryOptions()
  )

  const isLoading = status === 'pending'
  const overview = data?.data

  return (
    <AdminShell title="儀表板">
      <div className="space-y-6">
        <StatCards counts={overview?.counts} isLoading={isLoading} />
        <CommentTrendChart
          data={overview?.commentTrend}
          isLoading={isLoading}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <CountBarChart
            title="文章分類分布"
            description="各分類的文章數量（前 10）"
            data={overview?.categoryPostCounts}
            isLoading={isLoading}
            emptyText="目前無分類資料"
          />
          <CountBarChart
            title="文章標籤分布"
            description="各標籤的文章數量（前 10）"
            data={overview?.tagPostCounts}
            isLoading={isLoading}
            emptyText="目前無標籤資料"
          />
          <CountBarChart
            title="日記專欄分布"
            description="各專欄的日記數量（前 10）"
            data={overview?.topicNoteCounts}
            isLoading={isLoading}
            emptyText="目前無專欄資料"
          />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecentCommentsList
            data={overview?.recentComments}
            isLoading={isLoading}
          />
          <RecentUsersList
            data={overview?.recentUsers}
            isLoading={isLoading}
          />
        </div>
      </div>
    </AdminShell>
  )
}
