import { db } from '@sao-blog/db'
import { friendArticles, friends } from '@sao-blog/db/schema/index'
import { and, desc, eq } from 'drizzle-orm'

// 朋友圈對外輸出（GET /friends.json）。格式是跨 blog 共用的規格，
// 同一個大版本內只新增欄位，不改名、不刪除。

export const FRIEND_CIRCLE_VERSION = 1

export interface FriendCircleJson {
  version: number
  generated_at: string
  stats: { friends_num: number; active_num: number; error_num: number; article_num: number }
  friends: { name: string; url: string; avatar: string }[]
  articles: {
    title: string
    link: string
    author: string
    avatar: string
    published: string | null
    summary: string
    summary_source: 'ai' | 'feed' | 'manual' | 'none'
  }[]
}

const CACHE_MS = 60_000
const MAX_ARTICLES = 200

let cache: { value: FriendCircleJson; at: number } | null = null

/** 寫入新資料後呼叫，下次讀取就重新組 */
export function invalidateFriendCircleJson() {
  cache = null
}

export async function buildFriendCircleJson(): Promise<FriendCircleJson> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value

  const circle = await db
    .select({
      id: friends.id,
      name: friends.name,
      url: friends.url,
      avatar: friends.avatar,
      fetchStatus: friends.fetchStatus,
    })
    .from(friends)
    .where(and(eq(friends.status, 'approved'), eq(friends.circleEnabled, true)))

  const rows = await db
    .select({
      title: friendArticles.title,
      link: friendArticles.link,
      publishedAt: friendArticles.publishedAt,
      firstSeenAt: friendArticles.firstSeenAt,
      summary: friendArticles.summary,
      summarySource: friendArticles.summarySource,
      author: friends.name,
      avatar: friends.avatar,
    })
    .from(friendArticles)
    .innerJoin(friends, eq(friends.id, friendArticles.friendId))
    .where(and(eq(friendArticles.hidden, false), eq(friends.status, 'approved'), eq(friends.circleEnabled, true)))
    // 沒有發布時間的文章用第一次抓到的時間排
    .orderBy(desc(friendArticles.publishedAt), desc(friendArticles.firstSeenAt))
    .limit(MAX_ARTICLES)

  const value: FriendCircleJson = {
    version: FRIEND_CIRCLE_VERSION,
    generated_at: new Date().toISOString(),
    stats: {
      friends_num: circle.length,
      active_num: circle.filter((f) => f.fetchStatus === 'ok' || f.fetchStatus === 'not_modified').length,
      error_num: circle.filter((f) => f.fetchStatus === 'error').length,
      article_num: rows.length,
    },
    friends: circle.map((f) => ({ name: f.name, url: f.url, avatar: f.avatar ?? '' })),
    articles: rows.map((a) => ({
      title: a.title,
      link: a.link,
      author: a.author,
      avatar: a.avatar ?? '',
      published: (a.publishedAt ?? a.firstSeenAt)?.toISOString() ?? null,
      summary: a.summary ?? '',
      summary_source: a.summary ? a.summarySource : 'none',
    })),
  }
  cache = { value, at: Date.now() }
  return value
}
