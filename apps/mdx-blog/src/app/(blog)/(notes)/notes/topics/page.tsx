import { orpc } from '@/lib/orpc'
import { BackToTopFAB } from '@/components/fab'
import { TopicGrid } from './_components/topic-grid'

const NoteTopicsPage = async () => {
  const data = await orpc.topic.getTopics.call({})

  if (!data || data.status === 'error') {
    return <div className="mt-20 text-center text-muted-foreground">載入失敗</div>
  }

  const topicList = data.data

  return (
    <>
      <div className="mx-auto mt-14 max-w-3xl px-4 lg:mt-[80px] lg:px-0 2xl:max-w-4xl">
        <header className="mb-12">
          <h1 className="tracking-widest text-neutral-10/50 uppercase mb-3">
            專欄
          </h1>
          <div className="mb-2 flex items-baseline gap-4">
            <p className="text-[4.5rem] leading-none font-extralight tracking-tighter text-neutral-10/50">
              {topicList.length}
            </p>
            <span className="text-muted-foreground">個專欄</span>
          </div>
        </header>

        {topicList.length === 0 ? (
          <div className="text-center text-2xl font-semibold text-muted-foreground py-20">
            尚無專欄
          </div>
        ) : (
          <TopicGrid topics={topicList} />
        )}
      </div>
      <BackToTopFAB />
    </>
  )
}

export default NoteTopicsPage
