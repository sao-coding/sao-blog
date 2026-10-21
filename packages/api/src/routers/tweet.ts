import { publicProcedure } from "@sao-blog/api/index";
import z from "zod";

// 推文內文切成片段，前端照片段畫（不塞 HTML，也不用 dangerouslySetInnerHTML）
const segment = z.object({
  type: z.enum(["text", "link", "mention", "hashtag"]),
  text: z.string(),
  href: z.string().optional(),
});

const tweetOutput = z.object({
  id: z.string(),
  url: z.string(),
  segments: z.array(segment),
  author: z.object({
    name: z.string(),
    handle: z.string(),
    avatar: z.string().nullable(),
    verified: z.boolean(),
  }),
  createdAt: z.string(),
  likes: z.number(),
  replies: z.number(),
  media: z.array(
    z.object({
      type: z.enum(["photo", "video"]),
      url: z.string(),
      width: z.number(),
      height: z.number(),
    })
  ),
});
type TweetData = z.infer<typeof tweetOutput>;
type Segment = z.infer<typeof segment>;

// cdn.syndication.twimg.com 回應中用得到的欄位（X 官方嵌入推文用的端點，免 API key；
// 非公開文件，格式可能變動，所以全部欄位都當成可選，抓不到就回 null 讓前端退回連結卡片）
interface Indexed {
  indices: [number, number];
}
interface SyndicationTweet {
  __typename?: string;
  id_str?: string;
  text?: string;
  display_text_range?: [number, number];
  created_at?: string;
  favorite_count?: number;
  conversation_count?: number;
  user?: {
    name?: string;
    screen_name?: string;
    profile_image_url_https?: string;
    is_blue_verified?: boolean;
    verified?: boolean;
  };
  entities?: {
    urls?: (Indexed & { expanded_url?: string; display_url?: string })[];
    hashtags?: (Indexed & { text: string })[];
    user_mentions?: (Indexed & { screen_name: string })[];
  };
  mediaDetails?: {
    type?: string;
    media_url_https?: string;
    original_info?: { width?: number; height?: number };
  }[];
}

const decode = (text: string) =>
  text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** 依 entities 的 indices（以 code point 計）把內文切成文字／連結／@／# 片段，只取 display_text_range 內 */
function toSegments(t: SyndicationTweet): Segment[] {
  const chars = Array.from(t.text ?? "");
  const [start, end] = t.display_text_range ?? [0, chars.length];
  const marks: { at: [number, number]; seg: Segment }[] = [
    ...(t.entities?.urls ?? []).map((u) => ({
      at: u.indices,
      seg: { type: "link" as const, text: u.display_url ?? u.expanded_url ?? "", href: u.expanded_url },
    })),
    ...(t.entities?.hashtags ?? []).map((h) => ({
      at: h.indices,
      seg: { type: "hashtag" as const, text: `#${h.text}`, href: `https://x.com/hashtag/${encodeURIComponent(h.text)}` },
    })),
    ...(t.entities?.user_mentions ?? []).map((u) => ({
      at: u.indices,
      seg: { type: "mention" as const, text: `@${u.screen_name}`, href: `https://x.com/${u.screen_name}` },
    })),
  ]
    .filter((m) => m.at[0] >= start && m.at[1] <= end)
    .sort((a, b) => a.at[0] - b.at[0]);

  const out: Segment[] = [];
  let cursor = start;
  for (const { at, seg } of marks) {
    if (at[0] < cursor) continue;
    if (at[0] > cursor) out.push({ type: "text", text: decode(chars.slice(cursor, at[0]).join("")) });
    out.push(seg);
    cursor = at[1];
  }
  if (cursor < end) out.push({ type: "text", text: decode(chars.slice(cursor, end).join("")) });
  return out;
}

// cdn.syndication 需要的 token，算法同 react-tweet
const tokenOf = (id: string) => ((Number(id) / 1e15) * Math.PI).toString(6 ** 2).replace(/(0+|\.)/g, "");

async function fetchTweet(id: string): Promise<TweetData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(
      `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${tokenOf(id)}`,
      { signal: controller.signal, headers: { "User-Agent": "SaoBlogBot/1.0" } }
    );
    if (!response.ok) return null;
    const t = (await response.json()) as SyndicationTweet;
    if (t.__typename === "TweetTombstone" || !t.user?.screen_name || !t.created_at) return null;
    return {
      id,
      url: `https://x.com/${t.user.screen_name}/status/${id}`,
      segments: toSegments(t),
      author: {
        name: t.user.name ?? t.user.screen_name,
        handle: t.user.screen_name,
        // _normal 是 48px，換成 _bigger（73px）在高解析螢幕上比較清楚
        avatar: t.user.profile_image_url_https?.replace("_normal.", "_bigger.") ?? null,
        verified: !!(t.user.is_blue_verified || t.user.verified),
      },
      createdAt: t.created_at,
      likes: t.favorite_count ?? 0,
      replies: t.conversation_count ?? 0,
      media: (t.mediaDetails ?? [])
        .filter((m) => m.media_url_https && (m.type === "photo" || m.type === "video" || m.type === "animated_gif"))
        .slice(0, 4)
        .map((m) => ({
          type: m.type === "photo" ? ("photo" as const) : ("video" as const),
          url: m.media_url_https!,
          width: m.original_info?.width ?? 16,
          height: m.original_info?.height ?? 9,
        })),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// 推文內容幾乎不會變：快取 24 小時；查不到（刪除、私人帳號、端點失敗）快取 1 小時
const CACHE_TTL = 24 * 60 * 60 * 1000;
const MISS_TTL = 60 * 60 * 1000;
const cache = new Map<string, { at: number; ttl: number; tweet: TweetData | null }>();

const getTweet = publicProcedure
  .route({ method: "GET", path: "/tweet" })
  .input(z.object({ id: z.string().regex(/^\d{1,25}$/) }))
  .output(tweetOutput.nullable())
  .handler(async ({ input }) => {
    const hit = cache.get(input.id);
    if (hit && Date.now() - hit.at < hit.ttl) return hit.tweet;
    const tweet = await fetchTweet(input.id);
    cache.set(input.id, { at: Date.now(), ttl: tweet ? CACHE_TTL : MISS_TTL, tweet });
    return tweet;
  });

export default { getTweet };
