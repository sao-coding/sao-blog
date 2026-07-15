import { adminProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { and, desc, eq, ilike } from "drizzle-orm";
import { files } from "@sao-blog/db/schema/index";
import z from "zod";
import { fileResponseSchema, listFilesInputSchema } from "@sao-blog/api/schema/storage";
import {
  buildKey,
  categoryFromMime,
  deleteObject,
  getActiveConfig,
  resolvePublicUrl,
  uploadObject,
  type FileCategory,
} from "@sao-blog/api/lib/storage";

const MAX_SIZE_BY_CATEGORY: Record<FileCategory, number> = {
  image: 10 * 1024 * 1024,
  document: 50 * 1024 * 1024,
  other: 50 * 1024 * 1024,
};

const uploadFile = adminProcedure
  .route({ method: "POST", path: "/files" })
  .input(z.object({ file: z.instanceof(File) }))
  .output(fileResponseSchema)
  .handler(async ({ input, context }) => {
    const config = await getActiveConfig();
    if (!config) {
      return { status: "error", message: "尚未設定儲存空間", data: null };
    }

    const { file } = input;
    const category = categoryFromMime(file.type);
    const maxSize = MAX_SIZE_BY_CATEGORY[category];
    if (file.size > maxSize) {
      return {
        status: "error",
        message: `檔案大小超過限制（上限 ${Math.floor(maxSize / 1024 / 1024)}MB）`,
        data: null,
      };
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop() ?? "" : "";
    const key = buildKey(category, ext);
    const body = new Uint8Array(await file.arrayBuffer());

    try {
      await uploadObject(config, key, body, file.type || "application/octet-stream");
    } catch (e) {
      return {
        status: "error",
        message: `上傳失敗：${e instanceof Error ? e.message : "未知錯誤"}`,
        data: null,
      };
    }

    const url = resolvePublicUrl(config, key);

    const [row] = await db
      .insert(files)
      .values({
        key,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        category,
        url,
        uploaderId: context.session.user.id,
      })
      .returning();

    if (!row) {
      return { status: "error", message: "上傳紀錄建立失敗", data: null };
    }

    return { status: "success", message: "上傳成功", data: row };
  });

const getFiles = adminProcedure
  .route({ method: "GET", path: "/files" })
  .input(listFilesInputSchema)
  .handler(async ({ input }) => {
    const { page, pageSize, category, search } = input;

    const conditions = [
      category ? eq(files.category, category) : undefined,
      search ? ilike(files.filename, `%${search}%`) : undefined,
    ].filter((c): c is NonNullable<typeof c> => Boolean(c));
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, total] = await Promise.all([
      db
        .select()
        .from(files)
        .where(where)
        .orderBy(desc(files.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.$count(files, where),
    ]);

    return {
      status: "success",
      message: "檔案列表取得成功",
      meta: { total, page, pageSize },
      data: rows,
    };
  });

const deleteFile = adminProcedure
  .route({ method: "DELETE", path: "/files/{id}" })
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => {
    const [existing] = await db.select().from(files).where(eq(files.id, input.id)).limit(1);
    if (!existing) {
      return { status: "error", message: "檔案不存在", data: null };
    }

    const config = await getActiveConfig();
    if (config) {
      try {
        await deleteObject(config, existing.key);
      } catch (e) {
        return {
          status: "error",
          message: `刪除儲存空間物件失敗：${e instanceof Error ? e.message : "未知錯誤"}`,
          data: null,
        };
      }
    }

    const [row] = await db.delete(files).where(eq(files.id, input.id)).returning();

    if (!row) {
      return { status: "error", message: "檔案刪除失敗", data: null };
    }

    return { status: "success", message: "檔案刪除成功", data: row };
  });

export default {
  uploadFile,
  getFiles,
  deleteFile,
};
