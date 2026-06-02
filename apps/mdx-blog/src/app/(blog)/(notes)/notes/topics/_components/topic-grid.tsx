"use client"

import { topicPublicSchema } from "@sao-blog/api/schema/topic"
import { motion } from "motion/react"
import Link from "next/link"
import z from "zod"

type Topic = z.infer<typeof topicPublicSchema>

const EASE = [0.25, 0.1, 0.25, 1] as const

interface TopicGridProps {
  topics: Topic[]
}

export function TopicGrid({ topics }: TopicGridProps) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { delayChildren: 0.08, staggerChildren: 0.07 },
        },
      }}
    >
      {topics.map((topic) => (
        <motion.div
          key={topic.id}
          variants={{
            hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
            show: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { duration: 0.38, ease: EASE },
            },
          }}
        >
          <Link
            href={`/notes/topics/${topic.slug}`}
            className="group block h-full rounded-xl border border-border/60 p-6 transition-colors hover:border-primary/60 hover:bg-muted/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                  {topic.name}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                  {topic.introduce}
                </p>
                {topic.description && (
                  <p className="mt-2 text-xs text-muted-foreground/70 line-clamp-2">
                    {topic.description}
                  </p>
                )}
              </div>
              {topic.color && (
                <span
                  className="mt-1 size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: topic.color }}
                />
              )}
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="tabular-nums">{topic.noteCount}</span>
              <span>篇筆記</span>
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}
