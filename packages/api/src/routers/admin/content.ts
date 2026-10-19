import { protectedProcedure } from "@sao-blog/api/index";
import { compileMdx, getRegistryJsonSchema } from "@sao-blog/mdx";
import z from "zod";
import { formatMdxErrors } from "../../lib/mdx-validate";

// 給後台與 MCP（AI 發文）用的內容工具：發文前先驗證 MDX、查詢可用元件。
// 這兩支會被 apps/server 的 MCP 自動註冊成 admin_content_previewMdx /
// admin_content_getComponents，description 就是 AI 看到的工具說明。

const previewMdx = protectedProcedure
    .route({
        method: "POST",
        path: "/content/preview",
        summary:
            "發文前驗證 MDX：用與前台完全相同的編譯管線編譯內容，回傳錯誤（含行號）或純文字 / 目錄 / 閱讀時間。" +
            "建立或更新『已發布』的文章 / 日記時，MDX 有錯誤會被拒絕存檔，請先用這支確認 ok: true。" +
            "規則：只能使用 admin_content_getComponents 列出的區塊元件（JSX 標籤，props 須符合其 schema）；" +
            "不支援 import / export 與 {JS 表達式}（{/* 註解 */} 除外）；HTML 標籤限白名單、不可有 on* 事件屬性。" +
            "profile：文章用 post（支援數學公式），日記用 note。",
    })
    .input(
        z.object({
            content: z.string(),
            profile: z.enum(["post", "note"]).default("post"),
        }),
    )
    .handler(async ({ input }) => {
        const result = await compileMdx(input.content, { profile: input.profile });

        if (!result.ok) {
            return {
                status: "success",
                message: `MDX 有 ${result.errors.length} 個錯誤：\n${formatMdxErrors(result.errors)}`,
                data: { ok: false as const, errors: result.errors },
            };
        }

        return {
            status: "success",
            message: "MDX 驗證通過",
            data: {
                ok: true as const,
                toc: result.toc.map(({ value, depth, href }) => ({ value, depth, href })),
                plainText: result.plainText,
                readingTime: result.readingTime,
                frontmatter: result.frontmatter,
            },
        };
    });

const getComponents = protectedProcedure
    .route({
        method: "GET",
        path: "/content/components",
        summary:
            "列出文章 / 日記 MDX 可用的區塊元件與各自的 props JSON Schema（children：是否可包子內容；" +
            "translatableProps：翻譯時需要翻的字串 props）。寫法為 JSX 標籤，例如 " +
            '<Alert type="warning" title="注意">內文</Alert>；mermaid / echarts 圖表用 ```mermaid / ```echarts 圍欄。',
    })
    .handler(() => ({
        status: "success",
        message: "可用元件清單",
        data: getRegistryJsonSchema(),
    }));

export default {
    previewMdx,
    getComponents,
};
