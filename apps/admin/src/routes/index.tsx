import { Link, createFileRoute, useRouteContext } from '@tanstack/react-router'
import { Button } from '@sao-blog/ui/components/button'
import { MessageCircleHeartIcon, NotebookPenIcon, SquarePenIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import AdminShell from '@/components/layout/admin-shell'
import { StatCards } from '@/components/dashboard/stat-cards'
import { CommentTrendChart } from '@/components/dashboard/comment-trend-chart'
import { CountBarChart } from '@/components/dashboard/count-bar-chart'
import { RecentCommentsList } from '@/components/dashboard/recent-comments-list'
import { RecentUsersList } from '@/components/dashboard/recent-users-list'
import { SearchIndexCard } from '@/components/dashboard/search-index-card'
import { orpc } from '@/utils/orpc'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const { data, status } = useQuery(
    orpc.admin.dashboard.getOverview.queryOptions()
  )

  const context = useRouteContext({ from: '__root__' })
  const name = context && 'session' in context ? context.session.user.name : ''
  const isLoading = status === 'pending'
  const overview = data?.data

  return (
    <AdminShell
      title={name ? `${greeting()}，${name}` : greeting()}
      description="網站的內容與互動概況。"
      actions={
        <>
          <Button variant="outline" render={<Link to="/thinking/editor" />} nativeButton={false} className="max-sm:hidden">
            <MessageCircleHeartIcon />
            想法
          </Button>
          <Button variant="outline" render={<Link to="/notes/editor" />} nativeButton={false}>
            <NotebookPenIcon />
            寫日記
          </Button>
          <Button render={<Link to="/posts/editor" />} nativeButton={false}>
            <SquarePenIcon />
            寫文章
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <StatCards counts={overview?.counts} growth={overview?.growth} isLoading={isLoading} />
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
        <SearchIndexCard />
      </div>
    </AdminShell>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早安'
  if (h < 14) return '午安'
  if (h < 18) return '午後好'
  return '晚安'
}
