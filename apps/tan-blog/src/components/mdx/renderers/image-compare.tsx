'use client'

import { useState } from 'react'
import { ChevronsLeftRightIcon } from 'lucide-react'
import { m } from '#/paraglide/messages'

export interface MdxImageCompareProps {
  before: string
  after: string
  beforeLabel?: string
  afterLabel?: string
  /** 替代文字，同時當圖說（跟一般圖片一樣自動編號） */
  alt?: string
}

/**
 * 前後對比：「之後」墊底，「之前」疊在上面用 clip-path 裁到分隔線位置。
 * 拖動用一個蓋滿整張圖的透明 <input type="range">：滑鼠拖、觸控拖、鍵盤方向鍵都能用，
 * 不用自己寫 pointer 事件。兩張圖最好同尺寸。
 *
 * ```mdx
 * <ImageCompare before="/img/old.png" after="/img/new.png" alt="設定頁改版" />
 * ```
 */
export const MdxImageCompare = ({
  before,
  after,
  beforeLabel,
  afterLabel,
  alt,
}: MdxImageCompareProps) => {
  const [pos, setPos] = useState(50)
  const beforeText = beforeLabel ?? m.compare_before()
  const afterText = afterLabel ?? m.compare_after()

  return (
    <figure className="mdx-block mdx-compare not-prose">
      <div className="mdx-compare-stage" style={{ '--pos': `${pos}%` } as React.CSSProperties}>
        <img
          src={after}
          alt={alt ? `${alt}（${afterText}）` : afterText}
          className="mdx-compare-img"
          loading="lazy"
          decoding="async"
        />
        <img
          src={before}
          alt={alt ? `${alt}（${beforeText}）` : beforeText}
          className="mdx-compare-img mdx-compare-before"
          loading="lazy"
          decoding="async"
        />
        <span className="mdx-compare-label" data-side="before" aria-hidden>
          {beforeText}
        </span>
        <span className="mdx-compare-label" data-side="after" aria-hidden>
          {afterText}
        </span>
        <span className="mdx-compare-divider" aria-hidden>
          <span className="mdx-compare-handle">
            <ChevronsLeftRightIcon />
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label={m.compare_slider()}
          aria-valuetext={`${Math.round(pos)}%`}
          className="mdx-compare-range"
        />
      </div>
      {alt && <figcaption className="mdx-figcaption">{alt}</figcaption>}
    </figure>
  )
}
