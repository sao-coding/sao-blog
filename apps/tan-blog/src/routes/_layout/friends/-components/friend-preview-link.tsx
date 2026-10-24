'use client'

import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Glimpse,
  GlimpseContent,
  GlimpseDescription,
  GlimpseImage,
  GlimpseTitle,
  GlimpseTrigger,
} from '@/components/kibo-ui/glimpse'
import { orpc } from '@/lib/orpc'
import { m } from '#/paraglide/messages'

// 友鏈卡片的首頁連結：滑鼠停留時預覽對方首頁的 OG 圖與描述（跟文章裡的外部連結同一套）。
// 停留一下才開，避免滑過整排卡片時一次打一堆預覽請求；打開過才會抓，結果快取一天。

export function FriendPreviewLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const { data, isLoading } = useQuery({
    ...orpc.linkPreview.getLinkPreview.queryOptions({ input: { url: href } }),
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
  })

  const hasPreview = Boolean(data?.image || data?.title || data?.description)

  return (
    <Glimpse onOpenChange={(open) => { if (open) setEnabled(true) }}>
      <GlimpseTrigger
        delay={350}
        closeDelay={100}
        render={<a href={href} target="_blank" rel="noopener noreferrer" className={className} />}
      >
        {children}
      </GlimpseTrigger>
      <GlimpseContent className="w-80">
        {isLoading || !data ? (
          <div className="animate-pulse space-y-2">
            <div className="mb-4 aspect-120/63 w-full rounded-md bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
          </div>
        ) : hasPreview ? (
          <>
            {data.image && <GlimpseImage src={data.image} alt={data.title ?? ''} referrerPolicy="no-referrer" />}
            {data.title && <GlimpseTitle>{data.title}</GlimpseTitle>}
            {data.description && <GlimpseDescription>{data.description}</GlimpseDescription>}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{m.friends_no_preview()}</p>
        )}
      </GlimpseContent>
    </Glimpse>
  )
}
