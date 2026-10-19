import type { CSSProperties, ReactNode } from 'react'
import { getSolarTerm, type Season } from '@/lib/season'
import { ganzhiYear } from '@/lib/ganzhi'
import { SITE_NAME } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { TERM_THEMES } from '@/lib/term-themes'

// 四季信箋：文章與日記的閱讀區做成一張箋紙。
// - 箋框：朱色「文武線」（外粗內細的雙線框），像傳統信箋的版框
// - 花箋：右上角垂下一枝「寫作當時季節」的淡彩花木（春桃、夏竹、秋楓、冬梅）
// - 落款：文末署干支年、節氣與署名，再蓋一方朱印

export function LetterPaper({
  date,
  children,
  className,
}: {
  date: Date | string
  children: ReactNode
  className?: string
}) {
  const { season, index } = getSolarTerm(new Date(date))
  return (
    // --season 用寫作當時的節氣色，花木顏色跟著那一季，而不是現在的季節
    <div className={cn('letter-paper', className)} style={{ '--season': TERM_THEMES[index].accent } as CSSProperties}>
      <SeasonSprig season={season} />
      <div className="relative">{children}</div>
    </div>
  )
}

// 署名與印文：取站名裡的漢字（「唯一のBlog」→「唯一」）
const SIGNATURE = [...SITE_NAME].filter((ch) => /\p{Script=Han}/u.test(ch)).join('')

// 落款：「丙午年 寒露　唯一 書」＋ 朱印
export function LetterSignature({ date, className }: { date: Date | string; className?: string }) {
  const { term } = getSolarTerm(new Date(date))
  return (
    <div className={cn('mt-14 flex items-end justify-end gap-4', className)}>
      <div className="text-right font-wenkai leading-relaxed text-muted-foreground">
        <p>
          {ganzhiYear(date)}年　{term}
        </p>
        <p className="text-foreground/80">{SIGNATURE}　書</p>
      </div>
      <Seal />
    </div>
  )
}

// 朱印：方形印章，白文（字留白、底為朱），略微歪斜、邊緣不規則，像真的蓋上去
function Seal() {
  return (
    <span aria-hidden className="seal">
      <span className="seal-text">{SIGNATURE}</span>
    </span>
  )
}

// 花箋角落的季節花木（簡筆淡彩，墨色枝幹＋季節色花葉）
function SeasonSprig({ season }: { season: Season }) {
  return (
    <svg aria-hidden className="letter-sprig" viewBox="0 0 160 160">
      {season === 'spring' && (
        <g>
          {/* 桃枝 */}
          <path d="M150 150 C120 120 105 100 70 80 M108 104 C112 88 122 78 134 72" className="sprig-branch" />
          {[
            [70, 80],
            [92, 90],
            [134, 72],
            [118, 112],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              {[0, 72, 144, 216, 288].map((r) => (
                <ellipse key={r} cx="0" cy="-6" rx="4" ry="6" transform={`rotate(${r})`} className="sprig-petal" />
              ))}
              <circle r="2" className="sprig-heart" />
            </g>
          ))}
        </g>
      )}
      {season === 'summer' && (
        <g>
          {/* 竹 */}
          <path d="M140 160 L128 40 M128 100 l-6 -2 M131 70 l-6 -2" className="sprig-branch" />
          {[
            'M128 100 C108 92 90 96 76 104 C94 100 110 100 128 100Z',
            'M130 72 C110 58 92 58 78 62 C96 64 112 66 130 72Z',
            'M128 52 C138 38 150 32 158 30 C148 38 140 44 128 52Z',
            'M130 84 C146 76 156 78 160 82 C150 80 140 82 130 84Z',
          ].map((d, i) => (
            <path key={i} d={d} className="sprig-leaf" />
          ))}
        </g>
      )}
      {season === 'autumn' && (
        <g>
          {/* 楓枝 */}
          <path d="M155 150 C130 128 112 112 84 96 M120 118 C122 104 128 94 138 86" className="sprig-branch" />
          {[
            [84, 96, 16],
            [138, 86, 13],
            [108, 126, 11],
          ].map(([x, y, s], i) => (
            <path
              key={i}
              transform={`translate(${x} ${y}) rotate(${i * 25 - 20})`}
              d={mapleLeafPath(s)}
              className="sprig-leaf"
            />
          ))}
        </g>
      )}
      {season === 'winter' && (
        <g>
          {/* 梅枝：枝幹轉折硬挺，花小而疏 */}
          <path d="M150 155 L128 128 L132 104 L108 84 M128 128 L102 122 M132 104 L150 86" className="sprig-branch" />
          {[
            [108, 84],
            [102, 122],
            [150, 86],
            [124, 100],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              {[0, 72, 144, 216, 288].map((r) => (
                <circle key={r} cx="0" cy="-4" r="3.6" transform={`rotate(${r})`} className="sprig-petal" />
              ))}
              <circle r="1.8" className="sprig-heart" />
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}

function mapleLeafPath(s: number) {
  const pts: string[] = []
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 === 0 ? s : s * 0.5
    pts.push(`${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`)
  }
  return `M${pts.join(' L')}Z`
}
