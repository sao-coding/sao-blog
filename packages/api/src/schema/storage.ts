import { z } from "zod";
import { createApiResponseSchema } from "./api";

export const fileCategorySchema = z.enum(["image", "document", "other"]);

export const storageConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  endpoint: z.string(),
  region: z.string(),
  bucket: z.string(),
  publicUrl: z.string().nullable(),
  forcePathStyle: z.boolean(),
  isActive: z.boolean(),
  hasSecretKey: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const storageConfigInputSchema = z.object({
  name: z.string().min(1, "請輸入設定名稱"),
  endpoint: z.string().min(1, "請輸入 Endpoint"),
  region: z.string().min(1, "請輸入 Region"),
  bucket: z.string().min(1, "請輸入 Bucket"),
  accessKeyId: z.string().min(1, "請輸入 Access Key ID"),
  // 編輯時留空表示不變更
  secretAccessKey: z.string().optional(),
  publicUrl: z.string().nullable().optional(),
  forcePathStyle: z.boolean().default(true),
});

export const fileSchema = z.object({
  id: z.string(),
  key: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  category: fileCategorySchema,
  url: z.string(),
  uploaderId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const fileResponseSchema = createApiResponseSchema(fileSchema);

export const listFilesInputSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(24),
  category: fileCategorySchema.optional(),
  search: z.string().optional(),
});
