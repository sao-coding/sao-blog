-- 補回遺失的 migration：儲存空間設定（storage_configs）與上傳檔案（files）。
-- 原始檔案（journal when = 1783962156116）曾在開發機套用後遺失，未進版控；
-- 0001 以後的 snapshot 已包含這些表，所以 drizzle-kit 不會再自動產生。
-- 沿用原本的 when 讓它排在 0000 與 0001 之間：已套用過原檔的資料庫
-- （最後一筆 migration 時間較晚）會直接略過；全新資料庫則依序建立。
-- 內容寫成冪等，即使在已有這些物件的資料庫上執行也不會失敗。
DO $$ BEGIN
	CREATE TYPE "public"."file_category" AS ENUM('image', 'document', 'other');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" varchar(1000) NOT NULL,
	"filename" varchar(500) NOT NULL,
	"mime_type" varchar(200) NOT NULL,
	"size" integer NOT NULL,
	"category" "file_category" NOT NULL,
	"url" varchar(1500) NOT NULL,
	"uploader_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "files_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "storage_configs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"endpoint" varchar(500) NOT NULL,
	"region" varchar(100) DEFAULT 'us-east-1' NOT NULL,
	"bucket" varchar(200) NOT NULL,
	"access_key_id" varchar(500) NOT NULL,
	"secret_access_key" varchar(500) NOT NULL,
	"public_url" varchar(500),
	"force_path_style" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "files" ADD CONSTRAINT "files_uploader_id_user_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_category_idx" ON "files" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_created_at_idx" ON "files" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "storage_configs_active_idx" ON "storage_configs" USING btree ("is_active");
