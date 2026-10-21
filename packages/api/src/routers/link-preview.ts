import { publicProcedure } from "@sao-blog/api/index";
import z from "zod";

const TITLE_REGEX = /<title[^>]*>([^<]+)<\/title>/;
const OG_TITLE_REGEX = /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/;
const DESCRIPTION_REGEX = /<meta[^>]*name="description"[^>]*content="([^"]+)"/;
const OG_DESCRIPTION_REGEX = /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/;
const OG_IMAGE_REGEX = /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/;
const OG_SITE_NAME_REGEX = /<meta[^>]*property="og:site_name"[^>]*content="([^"]+)"/;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", nbsp: " " };

/** 標題、描述裡常見的 HTML 實體（&amp; &#39; &#x2F;…）還原成文字 */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** 相對網址（/og.png、//cdn…）以實際回應的網址為基準轉成絕對網址 */
function absolute(href: string | undefined, base: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(decodeEntities(href), base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** 找網站圖示：優先 apple-touch-icon（尺寸大，放在卡片上比較清楚），其次 icon */
function findIcon(html: string): string | undefined {
  let icon: string | undefined;
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase().split(/\s+/);
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!rel || !href) continue;
    if (rel.includes("apple-touch-icon")) return href;
    if (rel.includes("icon")) icon ??= href;
  }
  return icon;
}

const EMPTY = { title: null, description: null, image: null, siteName: null, favicon: null };

const getLinkPreview = publicProcedure
  .route({ method: "GET", path: "/link-preview" })
  .input(z.object({ url: z.url() }))
  .output(
    z.object({
      title: z.string().nullable(),
      description: z.string().nullable(),
      image: z.string().nullable(),
      /** og:site_name，例如「GitHub」 */
      siteName: z.string().nullable(),
      /** 網站圖示的絕對網址 */
      favicon: z.string().nullable(),
    })
  )
  .handler(async ({ input }) => {
    const { url } = input;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SaoBlogBot/1.0)" },
      });
      const html = await response.text();
      // 轉址後的網址才是相對路徑的基準
      const base = response.url || url;

      const titleMatch = html.match(OG_TITLE_REGEX) || html.match(TITLE_REGEX);
      const descriptionMatch = html.match(OG_DESCRIPTION_REGEX) || html.match(DESCRIPTION_REGEX);
      const text = (match: RegExpMatchArray | null) => {
        const value = match?.at(1)?.trim();
        return value ? decodeEntities(value) : null;
      };

      return {
        title: text(titleMatch),
        description: text(descriptionMatch),
        image: absolute(html.match(OG_IMAGE_REGEX)?.at(1), base),
        siteName: text(html.match(OG_SITE_NAME_REGEX)),
        favicon: absolute(findIcon(html), base),
      };
    } catch {
      return EMPTY;
    } finally {
      clearTimeout(timeout);
    }
  });

export default { getLinkPreview };
