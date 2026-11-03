'use client'

import { useState } from 'react'
import { PlayIcon } from 'lucide-react'
import { SiBilibili, SiYoutube } from '@icons-pack/react-simple-icons'
import { m } from '#/paraglide/messages'

export interface MdxEmbedProps {
  src: string
  title?: string
}

type Video =
  | { provider: 'youtube'; id: string; vertical: boolean }
  | { provider: 'bilibili'; id: string; vertical: false }

// 網址格式已由 registry 的 EMBED_URL_PATTERN 驗證過，這裡只負責取出影片 ID
function parseVideo(src: string): Video | null {
  const bv = src.match(/bilibili\.com\/video\/(BV\w{10})/)
  if (bv) return { provider: 'bilibili', id: bv[1], vertical: false }
  const yt = src.match(/(?:[?&]v=|youtu\.be\/|\/shorts\/|\/embed\/)([\w-]{11})/)
  if (yt) return { provider: 'youtube', id: yt[1], vertical: src.includes('/shorts/') }
  return null
}

const playerUrl = (video: Video) =>
  video.provider === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1`
    : `https://player.bilibili.com/player.html?bvid=${video.id}&autoplay=1&high_quality=1`

/**
 * 影片嵌入（YouTube / Bilibili）。先只顯示縮圖與播放鈕（facade），點了才建立 iframe：
 * 不在載入文章時就拉進整個播放器與追蹤腳本；YouTube 用 youtube-nocookie 網域。
 * Bilibili 沒有免 API 的縮圖網址，顯示紙色底＋圖示。
 *
 * ```mdx
 * <Embed src="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="示範影片" />
 * ```
 */
export const MdxEmbed = ({ src, title }: MdxEmbedProps) => {
  const [playing, setPlaying] = useState(false)
  const video = parseVideo(src)

  if (!video) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="sao-link">
        {title ?? src}
      </a>
    )
  }

  const Logo = video.provider === 'youtube' ? SiYoutube : SiBilibili
  const providerName = video.provider === 'youtube' ? 'YouTube' : 'Bilibili'
  const label = title ?? providerName

  return (
    <figure className="mdx-block mdx-embed not-prose" data-vertical={video.vertical || undefined}>
      <div className="mdx-embed-frame">
        {playing ? (
          <iframe
            src={playerUrl(video)}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            className="mdx-embed-facade"
            onClick={() => setPlaying(true)}
            aria-label={m.embed_play({ title: label })}
          >
            {video.provider === 'youtube' ? (
              <img
                src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : (
              // 沒有縮圖：大大的平台標誌淡淡壓在紙色底上
              <Logo className="mdx-embed-watermark" aria-hidden />
            )}
            <span className="mdx-embed-play">
              <PlayIcon aria-hidden />
            </span>
            <span className="mdx-embed-provider">
              <Logo aria-hidden />
              {providerName}
            </span>
          </button>
        )}
      </div>
      {title && <figcaption className="mdx-figcaption">{title}</figcaption>}
    </figure>
  )
}
