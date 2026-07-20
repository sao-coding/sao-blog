import { orpc } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { notFound } from 'next/navigation'
import { TopicNotesList } from './_components/topic-notes-list'
import Link from 'next/link'

export const revalidate = 300

// 同 posts/[slug]：build time 把現有專欄 slug 烤成靜態頁，
// 新專欄一樣靠 dynamicParams 預設 true 做 ISR fallback。
export async function generateStaticParams() {
  try {
    const res = await orpc.topic.getTopics.call({})
    if (res.status !== 'success' || !res.data) return []
    return res.data.map((topic) => ({ slug: topic.slug }))
  } catch (err) {
    console.error('Failed to generate static params for topics:', err)
    return []
  }
}

interface Props {
  params: Promise<{ slug: string }>
}

const TopicDetailPage = async ({ params }: Props) => {
  const { slug } = await params
  const data = await orpc.topic.getTopicBySlug.call({ slug })

  if (!data || data.status === 'error') {
    notFound()
  }

  const { topic, notes } = data.data

  return (
    <>
      <div className="mx-auto mt-14 max-w-3xl px-4 lg:mt-[80px] lg:px-0 2xl:max-w-4xl">
        <header className="mb-12">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/notes/topics" className="hover:text-foreground transition-colors">
              專欄
            </Link>
            <span>/</span>
            <span className="text-foreground">{topic.name}</span>
          </div>

          <div className="flex items-start gap-4">
            {topic.color && (
              <span
                className="mt-2 size-3 shrink-0 rounded-full"
                style={{ backgroundColor: topic.color }}
              />
            )}
            <div>
              <h1 className="text-[3rem] leading-none font-extralight tracking-tighter text-neutral-10/80 mb-3">
                {topic.name}
              </h1>
              <p className="text-muted-foreground">{topic.introduce}</p>
              {topic.description && (
                <p className="mt-2 text-sm text-muted-foreground/70">{topic.description}</p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="tabular-nums font-light text-foreground">{notes.length}</span>
                {' '}篇筆記
              </p>
            </div>
          </div>
        </header>

        <div className="relative ml-1 border-l-2">
          {notes.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground pl-6">尚無筆記</div>
          ) : (
            <TopicNotesList notes={notes} />
          )}
        </div>
      </div>
      <BackToTopFAB />
    </>
  )
}

export default TopicDetailPage
