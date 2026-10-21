'use client'
import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

export const Echarts = ({ children }: { children: string }) => {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chartRef.current) {
      const chart = echarts.init(chartRef.current)
      try {
        const option = JSON.parse(children)
        chart.setOption(option)
      } catch {
        chart.setOption({
          title: { text: 'Echarts JSON 格式錯誤' },
        })
      }
      // 容器變寬變窄（轉手機方向、側欄開合）時跟著重畫，不然 canvas 會停在初始化當下的寬度
      const observer = new ResizeObserver(() => chart.resize())
      observer.observe(chartRef.current)
      return () => {
        observer.disconnect()
        chart.dispose()
      }
    }
  }, [children])

  return (
    <div
      ref={chartRef}
      className="echarts"
      style={{ width: '100%', height: 400 }}
    />
  )
}
