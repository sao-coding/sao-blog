// 首頁的信（DESIGN.md 第 5 節，2026-11-03 站主選的）：hero 以下不排列表，寫一封給來訪者的短信，句子由現有的資料組成——
// 這個節氣寫了哪幾篇（沒寫就照實說上一篇是什麼時候）、最近一則想法、上一封來信（最新一則公開留言）。
// 篇名、想法、留言都嵌在句子裡，滑過轉朱、點了去那一頁。句型在三語 messages 裡（語序各語系自己定），沒有的資料那一句就不寫。
import { Link } from '@tanstack/react-router'
import { getSolarTerm } from '@/lib/season'
import type { TermAt } from '@/lib/saijiki'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { rich, token } from './rich'

export interface LetterWork {
  id: string
  title: string
  href: string
  createdAt: string
}

export interface LetterThought {
  id: string
  content: string
  createdAt: string
}

export interface LetterComment {
  id: string
  displayUsername: string
  content: string
  createdAt: string
  ref: { title: string; href: string }
}

const DAY = 86_400_000
// 太舊的想法、留言不寫進「最近」
const THOUGHT_DAYS = 120
const COMMENT_DAYS = 180
// 這個節氣寫的篇名最多列幾篇
const TITLES = 3

/** 想法、留言只取一句：第一個句號（或換行）以前，太長就截斷 */
function sentence(text: string, max: number) {
  const s = text.replace(/\s+/g, ' ').trim()
  const cut = s.search(/[。！？!?]|\.\s/)
  const one = cut > 0 && cut < max ? s.slice(0, cut + 1) : s
  return one.length > max ? `${one.slice(0, max).trimEnd()}…` : one
}

const linkClass =
  'text-ink-1 underline decoration-ink-4 decoration-1 underline-offset-[0.3em] outline-none transition-colors duration-200 hover:text-zhu hover:decoration-zhu focus-visible:text-zhu'

function Title({ work }: { work: { title: string; href: string } }) {
  return (
    <Link to={work.href} className={linkClass}>
      {m.home_letter_title({ title: work.title })}
    </Link>
  )
}

export function HomeLetter({
  works,
  thought,
  comment,
  term,
  now,
}: {
  // 新→舊
  works: LetterWork[]
  thought?: LetterThought
  comment?: LetterComment
  term: TermAt
  now: Date
}) {
  const locale = getLocale()
  const termName = (name: string) => (
    <span lang="zh-Hant" className="text-zhu">
      {name}
    </span>
  )

  // 這個節氣寫的（照寫的順序列）
  const thisTerm = works.filter((w) => new Date(w.createdAt).getTime() >= term.start)
  const shown = thisTerm.slice(0, TITLES).reverse()
  const list = new Intl.ListFormat(locale, { type: 'conjunction' }).format(shown.map((_, i) => token(`w${i}`)))
  const titles = Object.fromEntries(shown.map((w, i) => [`w${i}`, <Title key={w.id} work={w} />]))

  let wrote: React.ReactNode = null
  if (thisTerm.length > TITLES) {
    wrote = rich(m.home_letter_wrote_many({ term: token('t'), count: String(thisTerm.length), titles: list }), {
      t: termName(term.name),
      ...titles,
    })
  } else if (thisTerm.length) {
    wrote = rich(m.home_letter_wrote({ term: token('t'), titles: list }), { t: termName(term.name), ...titles })
  } else if (works[0]) {
    const last = works[0]
    wrote = rich(m.home_letter_quiet({ term: token('t'), prev: token('p'), title: token('w') }), {
      t: termName(term.name),
      p: termName(getSolarTerm(new Date(last.createdAt)).term),
      w: <Title work={last} />,
    })
  }

  const fresh = (iso: string, days: number) => now.getTime() - new Date(iso).getTime() < days * DAY
  const thinking =
    thought && fresh(thought.createdAt, THOUGHT_DAYS)
      ? rich(m.home_letter_thinking({ quote: token('q') }), {
          q: (
            <Link to="/thinking" lang="zh-Hant" className={linkClass}>
              {m.home_letter_quote({ text: sentence(thought.content, 60) })}
            </Link>
          ),
        })
      : null
  const letter =
    comment && fresh(comment.createdAt, COMMENT_DAYS)
      ? rich(m.home_letter_comment({ name: token('n'), title: token('w'), quote: token('q') }), {
          n: <span className="text-ink-1">{comment.displayUsername}</span>,
          w: <Title work={comment.ref} />,
          q: <span className="text-ink-2">{m.home_letter_quote({ text: sentence(comment.content, 50) })}</span>,
        })
      : null

  return (
    <div className="font-display text-xl leading-[1.95] text-ink-1 md:text-[1.6rem]">
      <h2 data-enter className="mb-8 text-5xl tracking-[0.06em] md:mb-10 md:text-6xl">
        {m.home_letter_greeting()}
      </h2>
      {/* 一句一段，句子之間空一行，像信 */}
      <div className="flex max-w-[30em] flex-col gap-6 text-pretty">
        {wrote && <p data-enter>{wrote}</p>}
        {thinking && <p data-enter>{thinking}</p>}
        {letter && <p data-enter>{letter}</p>}
      </div>
    </div>
  )
}
