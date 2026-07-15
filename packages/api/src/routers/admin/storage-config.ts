import { protectedProcedure } from "@sao-blog/api/index";
import { db } from "@sao-blog/db";
import { eq, desc, ne, and } from "drizzle-orm";
import { storageConfigs, type StorageConfigModel } from "@sao-blog/db/schema/index";
import z from "zod";
import { storageConfigInputSchema } from "@sao-blog/api/schema/storage";
import { testConnection as testS3Connection } from "@sao-blog/api/lib/storage";

function toOutput(row: StorageConfigModel) {
  const { secretAccessKey, ...rest } = row;
  return { ...rest, hasSecretKey: Boolean(secretAccessKey) };
}

const getConfigs = protectedProcedure
  .route({ method: "GET", path: "/storage/configs" })
  .handler(async () => {
    const rows = await db
      .select()
      .from(storageConfigs)
      .orderBy(desc(storageConfigs.createdAt));

    return {
      status: "success",
      message: "儲存設定列表取得成功",
      data: rows.map(toOutput),
    };
  });

const getConfig = protectedProcedure
  .route({ method: "GET", path: "/storage/configs/{id}" })
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => {
    const [row] = await db
      .select()
      .from(storageConfigs)
      .where(eq(storageConfigs.id, input.id))
      .limit(1);

    if (!row) {
      return { status: "error", message: "儲存設定不存在", data: null };
    }

    return { status: "success", message: "儲存設定取得成功", data: toOutput(row) };
  });

const createConfig = protectedProcedure
  .route({ method: "POST", path: "/storage/configs" })
  .input(storageConfigInputSchema)
  .handler(async ({ input }) => {
    if (!input.secretAccessKey) {
      return { status: "error", message: "請輸入 Secret Access Key", data: null };
    }

    const [row] = await db
      .insert(storageConfigs)
      .values({
        name: input.name,
        endpoint: input.endpoint,
        region: input.region,
        bucket: input.bucket,
        accessKeyId: input.accessKeyId,
        secretAccessKey: input.secretAccessKey,
        publicUrl: input.publicUrl ?? null,
        forcePathStyle: input.forcePathStyle,
      })
      .returning();

    if (!row) {
      return { status: "error", message: "儲存設定新增失敗", data: null };
    }

    return { status: "success", message: "儲存設定新增成功", data: toOutput(row) };
  });

const updateConfig = protectedProcedure
  .route({ method: "PUT", path: "/storage/configs/{id}" })
  .input(storageConfigInputSchema.extend({ id: z.string() }))
  .handler(async ({ input }) => {
    const { id, secretAccessKey, ...rest } = input;

    const [row] = await db
      .update(storageConfigs)
      .set({
        ...rest,
        publicUrl: rest.publicUrl ?? null,
        ...(secretAccessKey ? { secretAccessKey } : {}),
        updatedAt: new Date(),
      })
      .where(eq(storageConfigs.id, id))
      .returning();

    if (!row) {
      return { status: "error", message: "儲存設定不存在或更新失敗", data: null };
    }

    return { status: "success", message: "儲存設定更新成功", data: toOutput(row) };
  });

const deleteConfig = protectedProcedure
  .route({ method: "DELETE", path: "/storage/configs/{id}" })
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => {
    const [existing] = await db
      .select()
      .from(storageConfigs)
      .where(eq(storageConfigs.id, input.id))
      .limit(1);

    if (!existing) {
      return { status: "error", message: "儲存設定不存在", data: null };
    }

    if (existing.isActive) {
      return { status: "error", message: "無法刪除啟用中的儲存設定", data: null };
    }

    const [row] = await db
      .delete(storageConfigs)
      .where(eq(storageConfigs.id, input.id))
      .returning();

    if (!row) {
      return { status: "error", message: "儲存設定刪除失敗", data: null };
    }

    return { status: "success", message: "儲存設定刪除成功", data: toOutput(row) };
  });

const activateConfig = protectedProcedure
  .route({ method: "POST", path: "/storage/configs/{id}/activate" })
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => {
    const [row] = await db.transaction(async (tx) => {
      await tx
        .update(storageConfigs)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(ne(storageConfigs.id, input.id), eq(storageConfigs.isActive, true)));

      return tx
        .update(storageConfigs)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(storageConfigs.id, input.id))
        .returning();
    });

    if (!row) {
      return { status: "error", message: "儲存設定不存在", data: null };
    }

    return { status: "success", message: "儲存設定已啟用", data: toOutput(row) };
  });

const testConnection = protectedProcedure
  .route({ method: "POST", path: "/storage/configs/{id}/test" })
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => {
    const [row] = await db
      .select()
      .from(storageConfigs)
      .where(eq(storageConfigs.id, input.id))
      .limit(1);

    if (!row) {
      return { status: "error", message: "儲存設定不存在", data: null };
    }

    const result = await testS3Connection(row);
    if (!result.ok) {
      return { status: "error", message: `連線測試失敗：${result.error}`, data: null };
    }

    return { status: "success", message: "連線測試成功", data: { ok: true } };
  });

export default {
  getConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
  activateConfig,
  testConnection,
};
