'use client'
import { useEffect, useRef, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { m } from '#/paraglide/messages'
import { Zoomable } from './zoomable'

// width / height / data-blur 由存檔時的編譯填入（@sao-blog/mdx 的 image-meta）：實際尺寸與 16px 模糊預覽
export type MdxImageProps = React.ImgHTMLAttributes<HTMLImageElement> & { 'data-blur'?: string }

type Status = 'loading' | 'loaded' | 'error'

// 貼上上傳時編輯器自動填的 alt（image.png 之類）不是真的圖說
const FILENAME_ALT = /^[\w\-. ]+\.(png|jpe?g|gif|webp|avif|svg|bmp|heic)$/i

// alt 直接當圖說；以 `_` 開頭的 alt 只當無障礙文字、不顯示圖說（裝飾圖用），例如 ![_分隔線](...)
// label 是燈箱上方的說明：檔名 alt 沒有意義，不顯示
const parseAlt = (alt?: string) => {
  if (!alt) return { text: '', label: undefined, showCaption: false }
  if (alt.startsWith('_')) return { text: alt.slice(1), label: alt.slice(1) || undefined, showCaption: false }
  if (FILENAME_ALT.test(alt)) return { text: alt, label: undefined, showCaption: false }
  return { text: alt, label: alt, showCaption: true }
}

// 外框樣式用 markdown 圖片的 title 指定：
//   ![說明](url "screenshot")：截圖放在襯底上
//   ![說明](url "polaroid")：拍立得，圖說用手寫字寫在相紙下緣，不編號
// 沒寫或寫別的就是預設（髮絲線＋柔影），非變體名稱的 title 照常當 tooltip
const FRAME_VARIANTS = ['screenshot', 'polaroid'] as const
type FrameVariant = (typeof FRAME_VARIANTS)[number] | 'plain'

const parseTitle = (title?: string): { variant: FrameVariant; title?: string } => {
  const v = title?.trim().toLowerCase()
  return FRAME_VARIANTS.includes(v as never) ? { variant: v as FrameVariant } : { variant: 'plain', title }
}

export const MdxImage = ({
  src,
  alt,
  title: rawTitle,
  className,
  width,
  height,
  'data-blur': blur,
  ...props
}: MdxImageProps) => {
  const ref = useRef<HTMLImageElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const { text, label, showCaption } = parseAlt(alt)
  const { variant, title } = parseTitle(rawTitle)
  const polaroid = variant === 'polaroid'

  // SSR 出來的 <img> 可能在 hydrate 前就載完（或失敗），onLoad／onError 不會再觸發，掛載時補查一次
  useEffect(() => {
    const img = ref.current
    if (img?.complete) setStatus(img.naturalWidth > 0 ? 'loaded' : 'error')
    else setStatus('loading')
  }, [src])

  if (!src) return null

  return (
    // span：markdown 圖片會出現在 <p> 裡，不能用 figure／figcaption
    <span className="mdx-figure my-6 block">
      {status === 'error' ? (
        <span role="img" aria-label={text || m.image_alt_fallback()} className="mdx-image-error">
          <ImageOff className="size-6 opacity-60" />
          <span>{m.image_load_failed()}</span>
          {text && <span className="text-xs opacity-70">{text}</span>}
        </span>
      ) : (
        <Zoomable label={label} gallery>
          <span className="mdx-photo" data-variant={variant}>
            <span
              className="mdx-image-frame"
              data-status={status}
              // 載入前墊模糊預覽；載完後由 CSS 拿掉背景
              style={blur ? { backgroundImage: `url(${blur})` } : undefined}
              data-blur={blur ? '' : undefined}
            >
              <img
                ref={ref}
                src={src as string}
                alt={text}
                title={title}
                data-lightbox-label={label}
                loading="lazy"
                decoding="async"
                width={width}
                height={height}
                // 有實際尺寸就照比例佔位（取代 CSS 預設的 16:9）
                style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
                className={cn('mdx-image h-auto w-full', className)}
                onLoad={() => setStatus('loaded')}
                onError={() => setStatus('error')}
                {...props}
              />
            </span>
            {/* 圖說與 alt 同一句：對螢幕閱讀器藏起來，避免連唸兩次 */}
            {polaroid && showCaption && <span className="mdx-polaroid-caption" aria-hidden>{text}</span>}
          </span>
        </Zoomable>
      )}
      {showCaption && !polaroid && <span className="mdx-figcaption">{text}</span>}
    </span>
  )
}
