"use client"

import { NoteInTopicSchema } from "@sao-blog/api/schema/topic"
import { motion } from "motion/react"
import Link from "next/link"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import z from "zod"

type NoteItem = z.infer<typeof NoteInTopicSchema>

const MONTH_EN = [
  'JAN','FEB','MAR','APR','MAY',
  'JUN','JUL','AUG','SEP','OCT','NOV','DEC',
] as const

const EASE = [0.25, 0.1, 0.25, 1] as const

interface MonthGroup {
  month: number
  year: number
  startIndex: number
  items: NoteItem[]
}

function groupByMonth(notes: NoteItem[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  let globalIdx = 0

  for (const note of notes) {
    const d = new Date(note.createdAt)
    const month = d.getMonth()
    const year = d.getFullYear()
    const last = groups.at(-1)

    if (last?.month === month && last?.year === year) {
      last.items.push(note)
    } else {
      groups.push({ month, year, startIndex: globalIdx, items: [note] })
    }

    globalIdx++
  }

  return groups
}

interface YearGroupProps {
  year: number
  groups: MonthGroup[]
  groupIndex: number
  allNotes: NoteItem[]
  hoveredIndex: number | null
  setHoveredIndex: (i: number | null) => void
  itemRefs: React.MutableRefObject<(HTMLLIElement | null)[]>
  listRef: React.RefObject<HTMLUListElement | null>
}

function YearSection({
  year, groups, groupIndex, hoveredIndex, setHoveredIndex, itemRefs, listRef
}: YearGroupProps) {
  const yearDelay = groupIndex * 0.04
  const count = groups.reduce((acc, g) => acc + g.items.length, 0)

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: 12, filter: "blur(5px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.48, delay: yearDelay, ease: EASE }}
        className="mb-4 flex items-baseline gap-3 pl-6"
      >
        <h2 className="text-5xl leading-none font-extralight tracking-tighter text-transparent [-webkit-text-stroke:1px_rgba(115,115,115,0.8)]">
          <time dateTime={String(year)}>{year}</time>
        </h2>
        <span className="text-sm text-muted-foreground">
          <span className="sr-only">共有</span>
          {count} 篇筆記
        </span>
      </motion.header>

      <motion.ul
        ref={listRef}
        className="relative timeline-indicator sao-timeline"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: {
              delayChildren: yearDelay + 0.12,
              staggerChildren: 0.06,
            },
          },
        }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {groups.map(({ month, startIndex, items }) => (
          <div key={`${year}-${month}`}>
            <motion.div
              className="flex items-center gap-3 px-7 py-2"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { duration: 0.3 } },
              }}
            >
              <span className="text-xs text-muted-foreground shrink-0">
                {month + 1}月 · {MONTH_EN[month]}
              </span>
              <span className="flex-1 border-t border-border/40" />
            </motion.div>

            {items.map((note, i) => {
              const idx = startIndex + i
              const day = String(new Date(note.createdAt).getDate()).padStart(2, '0')

              return (
                <motion.li
                  key={note.id}
                  ref={(el) => { itemRefs.current[idx] = el }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  className="group py-3 px-7"
                  variants={{
                    hidden: { opacity: 0, y: 8, filter: "blur(3px)" },
                    show: {
                      opacity: 1,
                      y: 0,
                      filter: "blur(0px)",
                      transition: { duration: 0.36, ease: EASE },
                    },
                  }}
                >
                  <Link
                    href={`/notes/${note.id}`}
                    className="flex items-baseline gap-6 transition-colors"
                  >
                    <time className="text-sm text-muted-foreground tabular-nums shrink-0 w-24 group-hover:text-primary">
                      {day}
                    </time>
                    <span className="text-foreground transition-colors truncate">
                      {note.title}
                    </span>
                    <span className="ml-auto text-sm text-muted-foreground hidden md:inline">
                      心情: {note.mood} / 天氣: {note.weather}
                    </span>
                  </Link>
                </motion.li>
              )
            })}
          </div>
        ))}
      </motion.ul>
    </>
  )
}

interface TopicNotesListProps {
  notes: NoteItem[]
}

export function TopicNotesList({ notes }: TopicNotesListProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  const updateIndicator = useCallback((index: number | null) => {
    const list = listRef.current
    if (!list) return

    if (index === null) {
      list.style.setProperty('--indicator-opacity', '0')
      return
    }

    const item = itemRefs.current[index]
    if (!item) return

    const { top: iTop, height } = item.getBoundingClientRect()
    const { top: lTop } = list.getBoundingClientRect()

    list.style.setProperty('--indicator-top', `${iTop - lTop}px`)
    list.style.setProperty('--indicator-height', `${height}px`)
    list.style.setProperty('--indicator-opacity', '1')
  }, [])

  useEffect(() => {
    updateIndicator(hoveredIndex)
    if (hoveredIndex === null) return

    const sync = () => updateIndicator(hoveredIndex)
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [hoveredIndex, updateIndicator])

  const yearGroups = useMemo(() => {
    const byYear = new Map<number, MonthGroup[]>()

    for (const g of groupByMonth(notes)) {
      const arr = byYear.get(g.year) ?? []
      arr.push(g)
      byYear.set(g.year, arr)
    }

    return Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, groups]) => ({ year, groups }))
  }, [notes])

  return (
    <>
      {yearGroups.map(({ year, groups }, index) => (
        <section key={year} className="mb-12">
          <YearSection
            year={year}
            groups={groups}
            groupIndex={index}
            allNotes={notes}
            hoveredIndex={hoveredIndex}
            setHoveredIndex={setHoveredIndex}
            itemRefs={itemRefs}
            listRef={listRef}
          />
        </section>
      ))}
    </>
  )
}
