import type { ImageMeta, ImageMetaResolver } from "@sao-blog/mdx";

// 存檔時替文章圖片讀出實際尺寸、產生模糊預覽（給 @sao-blog/mdx 的 compileMdx({ imageMeta }) 用）。
// 只在 API 端使用：sharp 是原生套件，tan-blog 不需要安裝它（前台的備援編譯不傳 imageMeta）。

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 25 * 1024 * 1024;
// 模糊預覽的寬度：16px 的 WebP 轉 base64 約 200–400 bytes，放大顯示時本來就是模糊的
const BLUR_WIDTH = 16;
const CACHE_LIMIT = 500;

// 同一張圖在不同語言版本、重編時不必重抓（行程重啟就清空）
const cache = new Map<string, ImageMeta | null>();

async function download(src: string): Promise<Buffer | null> {
  const res = await fetch(src, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) return null;
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.byteLength > MAX_BYTES ? null : buf;
}

async function probe(src: string): Promise<ImageMeta | null> {
  // 站內相對路徑（/img/...）沒有網域可抓，交給前台預設佔位
  if (!/^https?:\/\//.test(src)) return null;
  const buf = await download(src);
  if (!buf) return null;

  const { default: sharp } = await import("sharp");
  const meta = await sharp(buf).metadata();
  if (!meta.width || !meta.height) return null;
  // EXIF 方向 5–8 代表旋轉 90°：瀏覽器顯示時會轉正，寬高要對調
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;

  let blur: string | undefined;
  try {
    const tiny = await sharp(buf).rotate().resize(BLUR_WIDTH).webp({ quality: 40 }).toBuffer();
    blur = `data:image/webp;base64,${tiny.toString("base64")}`;
  } catch {
    // 動畫或特殊格式產生不了預覽圖時，只給尺寸
  }
  return { width, height, blur };
}

export const resolveImageMeta: ImageMetaResolver = async (src) => {
  if (cache.has(src)) return cache.get(src) ?? null;
  const meta = await probe(src).catch((err) => {
    console.warn(`[image-meta] ${src}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  });
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(src, meta);
  return meta;
};
