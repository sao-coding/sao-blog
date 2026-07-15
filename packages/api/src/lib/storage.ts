import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { db } from "@sao-blog/db";
import { storageConfigs, type StorageConfigModel } from "@sao-blog/db/schema/index";
import { eq } from "drizzle-orm";

export type FileCategory = "image" | "document" | "other";

/**
 * 依當前啟用的儲存設定取得已快取的 S3Client；設定變更（updatedAt 改變）時自動重建。
 */
let cachedClient: { key: string; client: S3Client } | null = null;

export async function getActiveConfig(): Promise<StorageConfigModel | null> {
  const [row] = await db
    .select()
    .from(storageConfigs)
    .where(eq(storageConfigs.isActive, true))
    .limit(1);
  return row ?? null;
}

export function createS3Client(config: StorageConfigModel): S3Client {
  const cacheKey = `${config.id}:${config.updatedAt.getTime()}`;
  if (cachedClient?.key === cacheKey) {
    return cachedClient.client;
  }
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle,
  });
  cachedClient = { key: cacheKey, client };
  return client;
}

export function resolvePublicUrl(config: StorageConfigModel, key: string): string {
  const base = config.publicUrl?.replace(/\/+$/, "") || `${config.endpoint.replace(/\/+$/, "")}/${config.bucket}`;
  return `${base}/${key}`;
}

export function categoryFromMime(mimeType: string): FileCategory {
  if (mimeType.startsWith("image/")) return "image";
  if (
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/") ||
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("powerpoint") ||
    mimeType.includes("officedocument")
  ) {
    return "document";
  }
  return "other";
}

export function buildKey(category: FileCategory, ext: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const base = `${category}s/${yyyy}/${mm}/${crypto.randomUUID()}`;
  return safeExt ? `${base}.${safeExt}` : base;
}

export async function uploadObject(
  config: StorageConfigModel,
  key: string,
  body: Uint8Array,
  contentType: string
): Promise<void> {
  const client = createS3Client(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function deleteObject(config: StorageConfigModel, key: string): Promise<void> {
  const client = createS3Client(config);
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );
}

export async function testConnection(config: StorageConfigModel): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = createS3Client(config);
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知錯誤" };
  }
}
