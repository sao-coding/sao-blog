import { publicProcedure } from "@sao-blog/api/index";
import z from "zod";

const TITLE_REGEX = /<title[^>]*>([^<]+)<\/title>/;
const OG_TITLE_REGEX = /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/;
const DESCRIPTION_REGEX = /<meta[^>]*name="description"[^>]*content="([^"]+)"/;
const OG_DESCRIPTION_REGEX = /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/;
const OG_IMAGE_REGEX = /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/;

const getLinkPreview = publicProcedure
  .route({ method: "GET", path: "/link-preview" })
  .input(z.object({ url: z.string().url() }))
  .output(
    z.object({
      title: z.string().nullable(),
      description: z.string().nullable(),
      image: z.string().nullable(),
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

      const titleMatch = html.match(OG_TITLE_REGEX) || html.match(TITLE_REGEX);
      const descriptionMatch = html.match(OG_DESCRIPTION_REGEX) || html.match(DESCRIPTION_REGEX);
      const imageMatch = html.match(OG_IMAGE_REGEX);

      return {
        title: titleMatch?.at(1) ?? null,
        description: descriptionMatch?.at(1) ?? null,
        image: imageMatch?.at(1) ?? null,
      };
    } catch {
      return { title: null, description: null, image: null };
    } finally {
      clearTimeout(timeout);
    }
  });

export default { getLinkPreview };
