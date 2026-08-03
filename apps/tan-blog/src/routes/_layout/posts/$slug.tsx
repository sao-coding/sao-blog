import { createFileRoute, notFound } from '@tanstack/react-router'
import { getCachedPost } from '@/lib/isr/post'
import { MdxContent } from '@/lib/mdx/mdx-content'
import { defaultMDXComponents } from '@/components/mdx'
import { blogPostingJsonLd, pageHead } from '@/lib/seo'
import { PostClientPage } from './-components/post-client-page'

export const Route = createFileRoute('/_layout/posts/$slug')({
  loader: async ({ params }) => {
    const data = await getCachedPost({ data: params.slug })
    if (!data) {
      throw notFound()
    }
    return data
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {}
    const description = loaderData.summary ?? 'MDX Blog Post'
    const publishedTime = loaderData.createdAt.toISOString()
    const modifiedTime = loaderData.updatedAt.toISOString()
    const tags = loaderData.tags.map((tag) => tag.name)
    const path = `/posts/${params.slug}`

    return {
      ...pageHead({
        title: loaderData.title,
        description,
        path,
        type: 'article',
        image: loaderData.cover ?? undefined,
        publishedTime,
        modifiedTime,
        tags,
        alternates: false,
      }),
      scripts: [
        blogPostingJsonLd({
          title: loaderData.title,
          description,
          path,
          image: loaderData.cover ?? undefined,
          authorName: loaderData.author.name ?? loaderData.author.displayUsername ?? undefined,
          publishedTime,
          modifiedTime,
          tags,
        }),
      ],
    }
  },
  headers: () => ({
    // 真正的 freshness 由伺服器端的 Nitro ISR 快取（src/lib/isr/post.ts）保證，
    // 發文/改文時會被 /api/revalidate 立即清掉；瀏覽器這層只給很短的 max-age，
    // 避免使用者端出現「已在 Nitro 側刷新、但瀏覽器還在吃舊的本地快取」的情況。
    'Cache-Control': 'public, max-age=30, must-revalidate',
  }),
  component: PostDetailPage,
})

function PostDetailPage() {
  const data = Route.useLoaderData()
  const { slug } = Route.useParams()

  return (
    <PostClientPage
      postId={data.id}
      showToc={data.frontmatter.showToc !== false}
      toc={data.toc}
      metaData={{
        category: data.category.name,
        tags: data.tags.map((tag) => tag.name),
        title: data.title,
        url: `/posts/${slug}`,
      }}
    >
      <MdxContent compiledSource={data.compiledSource} components={defaultMDXComponents} />
    </PostClientPage>
  )
}
