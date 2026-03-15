import { evaluate } from 'next-mdx-remote-client/rsc'
import type { Metadata, ResolvingMetadata } from 'next'
import { ErrorComponent } from '@/components/index'
import { components } from '@/components/mdx/mdx-renderer'
import getMdxOptions from '@/components/mdx/parsers'
import type { TocItem } from 'remark-flexible-toc'
import { ApiResponse } from '@/types/api'
import { PostItem } from '@/types/post'
import { PostClientPage } from './_components/post-client-page'
import { client } from '@/lib/orpc'
import { id } from 'date-fns/locale'

type Scope = {
  readingTime: string
  toc?: TocItem[]
}

type Frontmatter = {
  title: string
  description?: string
  keywords?: string
  author: string
  date?: string
  showToc?: boolean
}

type MetadataProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  { params }: MetadataProps,
  _parent: ResolvingMetadata
) {
  const slug = (await params).slug
  const post = await getPostData(slug)

  // console.log('Generating metadata for post:', parent, 'post', post)

  return {
    title: post.title,
    description: post.summary || 'MDX Blog Post',
    keywords: post.tags.map((tag) => tag.name).join(', '),
    author: post.author,
    date: post.content,
  }
}

const getPostData = async (slug: string) => {
  try {
    const data: ApiResponse<PostItem> = await client.post.getPost({ id: slug })
    console.log('RPC result:', JSON.stringify(data, null, 2))

    // 確保 data.data 存在
    if (!data.data) {
      throw new Error('Post data is empty')
    }

    return data.data
  } catch (err) {
    console.error('Error fetching post data:', err)
    throw new Error('Failed to fetch post data')
  }
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // console.log('Fetching post data for slug:', slug)
  let source: string | null = null
  let data: PostItem
  try {
    // await new Promise((resolve) => setTimeout(resolve, 2000))
    data = await getPostData(slug)
    source = data.content
    // console.log('MDX source:', source)
  } catch (err) {
    return <ErrorComponent error="讀取內容時發生錯誤！" />
  }

  if (!source || typeof source !== 'string') {
    return <ErrorComponent error="找不到內容來源或內容格式錯誤！" />
  }

  const { content, frontmatter, scope, error } = await evaluate<
    Frontmatter,
    Scope
  >({
    source,
    options: getMdxOptions(source),
    components: components,
  })

  if (error) {
    return <ErrorComponent error={error.message} />
  }

  const showToc = frontmatter.showToc !== false

  return (
    <PostClientPage
      postId={data.id}
      showToc={showToc}
      toc={scope.toc || []}
      metaData={{
        category: data.category.name,
        tags: data.tags.map((tag) => tag.name),
        title: frontmatter.title,
        url: `/posts/${slug}`,
      }}
    >
      {content}
    </PostClientPage>
  )
}
