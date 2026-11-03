import { render } from 'takumi-js'
import { Renderer } from 'takumi-js/node'
import { siteName } from '@/lib/seo'

// 動態 OG 圖（1200×630 PNG）：takumi（Rust 原生渲染器）把 JSX 直接繪成 PNG。
// 只在 server route（src/routes/og/*）裡呼叫，不會進 client bundle。

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

export interface OgImageInput {
  title: string
  description?: string
  // 標題上方的小標籤，例如「文章 · 前端」「日記」
  eyebrow?: string
  // 底部右側的資訊列，例如日期、標籤
  meta?: string[]
  // 站內大頭貼的絕對網址（takumi 會自己 fetch）
  avatarUrl: string
}

// ── 字型 ────────────────────────────────────────────────────────────────────
// CJK 字型完整檔動輒數 MB，這裡用 Google Fonts 的 `text=` 參數只取這張圖用到的
// 字形子集（通常幾十 KB），並以「字重 + 文字」為 key 做記憶體快取。
// 不帶瀏覽器 UA 請求時 Google 會回 truetype。
const fontCache = new Map<string, Promise<ArrayBuffer>>()
const FONT_FAMILY = 'LXGW WenKai TC'

async function fetchFont(weight: number, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(FONT_FAMILY)}:wght@${weight}&text=${encodeURIComponent(text)}`
  const css = await fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Google Fonts CSS ${res.status}`)
    return res.text()
  })
  const match = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)
  if (!match) throw new Error('Google Fonts: no truetype source in CSS')
  const res = await fetch(match[1])
  if (!res.ok) throw new Error(`Google Fonts file ${res.status}`)
  return res.arrayBuffer()
}

function loadFont(weight: number, text: string) {
  // 去重排序，讓相同字集的請求共用快取
  const chars = [...new Set(text)].sort().join('')
  const key = `${weight}:${chars}`
  let font = fontCache.get(key)
  if (!font) {
    font = fetchFont(weight, chars)
    font.catch(() => fontCache.delete(key))
    fontCache.set(key, font)
    if (fontCache.size > 500) {
      const oldest = fontCache.keys().next().value
      if (oldest) fontCache.delete(oldest)
    }
  }
  return font
}

function clamp(text: string, max: number) {
  const chars = [...text]
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : text
}

// ── 版面 ────────────────────────────────────────────────────────────────────
// 「宣紙 + 朱印」：與站內預設的淺色宣紙主題、文楷字體一致。
// 版面一律用明確的 flex 排版（與 next/og 寫法相容）。
const PAPER = '#f3ede0'
const INK = '#221d17'
const INK_SOFT = '#6f665a'
const ZHU = '#b8372e' // 朱砂
const SEAL_CHAR = '影'

function OgCard({ title, description, eyebrow, meta, avatarUrl }: OgImageInput) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        padding: 28,
        backgroundColor: PAPER,
        // 右上一輪淡日、左下一抹遠山的暈染
        backgroundImage:
          'radial-gradient(circle at 88% 18%, rgba(184,55,46,0.16), transparent 30%), radial-gradient(ellipse at 8% 108%, rgba(34,29,23,0.14), transparent 48%)',
        fontFamily: FONT_FAMILY,
        color: INK,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '44px 56px 40px',
          border: `2px solid ${INK}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: 6,
                backgroundColor: ZHU,
                color: PAPER,
                fontSize: 36,
                fontWeight: 700,
              }}
            >
              {SEAL_CHAR}
            </div>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 700 }}>{siteName()}</div>
          </div>
          {eyebrow ? (
            <div
              style={{
                display: 'flex',
                padding: '6px 20px',
                fontSize: 24,
                color: ZHU,
                border: `2px solid ${ZHU}`,
                borderRadius: 9999,
              }}
            >
              {eyebrow}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 24 ? 62 : 76,
              fontWeight: 700,
              lineHeight: 1.25,
            }}
          >
            {title}
          </div>
          {description ? (
            <div
              style={{
                display: 'flex',
                fontSize: 30,
                lineHeight: 1.55,
                color: INK_SOFT,
              }}
            >
              {description}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 20,
            borderTop: `1px solid rgba(34,29,23,0.25)`,
          }}
        >
          <div style={{ display: 'flex', fontSize: 25, color: INK_SOFT }}>
            {meta && meta.length > 0 ? meta.join('  ·  ') : ''}
          </div>
          <img
            src={avatarUrl}
            width={52}
            height={52}
            style={{ borderRadius: 9999, border: `2px solid ${INK}` }}
          />
        </div>
      </div>
    </div>
  )
}

export async function renderOgImage(input: OgImageInput): Promise<Uint8Array> {
  const normalized: OgImageInput = {
    ...input,
    title: clamp(input.title, 60),
    description: input.description ? clamp(input.description, 90) : undefined,
    eyebrow: input.eyebrow ? clamp(input.eyebrow, 40) : undefined,
    meta: input.meta?.filter(Boolean).map((item) => clamp(item, 30)),
  }

  const regularText = [
    normalized.eyebrow,
    normalized.description,
    ...(normalized.meta ?? []),
    '·…',
  ].join('')
  const boldText = `${normalized.title}${siteName()}${SEAL_CHAR}`

  const [regular, bold] = await Promise.all([loadFont(400, regularText), loadFont(700, boldText)])

  // 每次請求用獨立 Renderer：字型是依文字取的子集，各請求不同，
  // 共用同一個 Renderer 會讓註冊的字型無限累積。
  const renderer = new Renderer()
  await Promise.all([
    renderer.registerFont({ name: FONT_FAMILY, data: regular, weight: 400, style: 'normal' }),
    renderer.registerFont({ name: FONT_FAMILY, data: bold, weight: 700, style: 'normal' }),
  ])

  return render(<OgCard {...normalized} />, {
    renderer,
    width: OG_WIDTH,
    height: OG_HEIGHT,
    format: 'png',
  })
}

export async function ogImageResponse(input: OgImageInput): Promise<Response> {
  try {
    const png = await renderOgImage(input)
    return new Response(png as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        // OG 圖會被社群平台爬蟲反覆抓；內容改動時 URL 不變，給一天 + SWR 足夠。
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch (err) {
    console.error('[og] render failed:', err)
    // 字型/渲染失敗時退回大頭貼，至少不讓分享卡片破圖。
    return Response.redirect(input.avatarUrl, 302)
  }
}

