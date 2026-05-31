import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import AdminShell from '@/components/layout/admin-shell'
import { StatCards } from '@/components/dashboard/stat-cards'
import { CommentTrendChart } from '@/components/dashboard/comment-trend-chart'
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
      </div>
    </AdminShell>
  )
}
