'use client'
import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

export const Echarts = ({ children }: { children: string }) => {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chartRef.current) {
      const chart = echarts.init(chartRef.current)
      try {
        const option = JSON.parse(children)
        chart.setOption(option)
      } catch (e) {
        chart.setOption({
          title: { text: 'Echarts JSON 格式錯誤' },
        })
      }
      return () => chart.dispose()
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
