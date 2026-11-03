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
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import dayjs from 'dayjs'

interface CommentTrendChartProps {
  data?: { date: string; count: number }[]
  isLoading?: boolean
}

const chartConfig = {
  count: {
    label: '留言數',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

export function CommentTrendChart({ data, isLoading }: CommentTrendChartProps) {
  const chartData = data ?? []
  const total = chartData.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>近兩週留言趨勢</CardTitle>
        <CardDescription>
          {isLoading ? '載入中...' : `最近 14 天共 ${total} 則留言`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[260px] items-center justify-center">
            <span className="text-muted-foreground">載入中...</span>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <AreaChart
              data={chartData}
              margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="fillComments" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-count)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-count)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(value) => dayjs(value).format('MM/DD')}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
                width={28}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value: string) =>
                      dayjs(value).format('YYYY-MM-DD')
                    }
                  />
                }
              />
              <Area
                dataKey="count"
                type="natural"
                fill="url(#fillComments)"
                stroke="var(--color-count)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
