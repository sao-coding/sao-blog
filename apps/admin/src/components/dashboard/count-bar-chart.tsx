'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@sao-blog/ui/components/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@sao-blog/ui/components/chart'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'

interface CountBarChartProps {
  title: string
  description?: string
  data?: { name: string; count: number; color?: string | null }[]
  isLoading?: boolean
  emptyText?: string
}

const chartConfig = {
  count: {
    label: '數量',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

export function CountBarChart({
  title,
  description,
  data,
  isLoading,
  emptyText = '目前無資料',
}: CountBarChartProps) {
  const chartData = data ?? []
  const isEmpty = !isLoading && chartData.length === 0
  // Each bar row is ~36px; min height 180px
  const chartHeight = Math.max(180, chartData.length * 36)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ height: chartHeight }}>
            <span className="text-muted-foreground text-sm">載入中...</span>
          </div>
        ) : isEmpty ? (
          <div className="flex items-center justify-center" style={{ height: chartHeight }}>
            <span className="text-muted-foreground text-sm">{emptyText}</span>
          </div>
        ) : (
          <ChartContainer config={chartConfig} style={{ height: chartHeight }} className="w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 4, right: 24, top: 4, bottom: 4 }}
            >
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tickMargin={8}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={88}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[0, 4, 4, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
