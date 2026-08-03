import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { pageHead } from '@/lib/seo'
import { m } from '#/paraglide/messages'
import { PostItem } from './-components/post-item'

const SkeletonCard = () => (
  <div className="animate-pulse rounded-lg border bg-surface-50 p-6 shadow-sm">
    <div className="h-6 w-3/4 rounded bg-gray-200"></div>
    <div className="mt-4 h-3 w-1/2 rounded bg-gray-200"></div>
    <div className="mt-6 flex gap-3">
      <div className="h-8 w-20 rounded bg-gray-200"></div>
      <div className="h-8 w-12 rounded bg-gray-200"></div>
    </div>
  </div>
)

export const Route = createFileRoute('/_layout/posts/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      orpc.post.getPosts.queryOptions({ input: {} })
    )
  },
  head: () => pageHead({
    title: m.page_posts_title(),
    description: m.page_posts_description(),
    path: '/posts',
  }),
  headers: () => ({
    'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=600',
  }),
  component: PostsIndexPage,
})

function PostsIndexPage() {
  const { data, error, isLoading, refetch } = useQuery(
    orpc.post.getPosts.queryOptions({ input: {} })
  )

  if (isLoading) {
    return (
      <div className="mt-20">
        <div className="mx-auto mt-14 max-w-3xl px-2 lg:mt-[80px] lg:px-0 2xl:max-w-4xl">
          <div className="flex flex-col gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <ErrorBlock
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  if (!data || data.status === 'error') {
    return (
      <ErrorBlock
        message={data?.message}
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="mt-20">
      <div className="mx-auto mt-14 max-w-3xl px-2 lg:mt-[80px] lg:px-0 2xl:max-w-4xl">
        <ul className="flex flex-col">
          {data.data.map((post) => (
            <li key={post.id}>
              <PostItem post={post} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const ErrorBlock = ({
  message,
  onRetry,
}: {
  message?: string
  onRetry: () => void
}) => (
  <div className="mt-20">
    <div className="mx-auto mt-14 max-w-3xl px-2 lg:mt-[80px] lg:px-0 2xl:max-w-4xl">
      <div className="flex items-center justify-between rounded-lg border bg-red-50 p-4">
        <div>
          <p className="font-medium text-red-700">載入文章失敗</p>
          <p className="text-sm text-red-600">
            {message ?? '請檢查網路或稍後再試。'}
          </p>
        </div>
        <button
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-95"
          onClick={onRetry}
        >
          重試
        </button>
      </div>
    </div>
  </div>
)
