CREATE TYPE "public"."locale" AS ENUM('zh-TW', 'en', 'ja');--> statement-breakpoint
CREATE TYPE "public"."translation_source" AS ENUM('human', 'ai');--> statement-breakpoint
CREATE TABLE "category_translations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"category_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_translations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"note_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" varchar(256) NOT NULL,
	"content" text NOT NULL,
	"compiled" jsonb,
	"toc" jsonb,
	"plain_text" text,
	"reading_time" integer,
	"status" boolean DEFAULT false NOT NULL,
	"is_source" boolean DEFAULT false NOT NULL,
	"translated_by" "translation_source" DEFAULT 'human' NOT NULL,
	"source_hash" varchar(64),
	"compiled_hash" varchar(64),
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_translations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"title" varchar(512) NOT NULL,
	"summary" text,
	"content" text NOT NULL,
	"compiled" jsonb,
	"toc" jsonb,
	"plain_text" text,
	"reading_time" integer,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"is_source" boolean DEFAULT false NOT NULL,
	"translated_by" "translation_source" DEFAULT 'human' NOT NULL,
	"source_hash" varchar(64),
	"compiled_hash" varchar(64),
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "default_locale" "locale" DEFAULT 'zh-TW' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "default_locale" "locale" DEFAULT 'zh-TW' NOT NULL;--> statement-breakpoint
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_translations" ADD CONSTRAINT "note_translations_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_translations" ADD CONSTRAINT "post_translations_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "category_translations_category_locale_uidx" ON "category_translations" USING btree ("category_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "note_translations_note_locale_uidx" ON "note_translations" USING btree ("note_id","locale");--> statement-breakpoint
CREATE INDEX "note_translations_locale_status_idx" ON "note_translations" USING btree ("locale","status");--> statement-breakpoint
CREATE UNIQUE INDEX "post_translations_post_locale_uidx" ON "post_translations" USING btree ("post_id","locale");--> statement-breakpoint
CREATE INDEX "post_translations_locale_status_idx" ON "post_translations" USING btree ("locale","status");--> statement-breakpoint
-- ─── 資料回填：既有內容全部成為 zh-TW 原文（is_source = true） ───
-- compiled / toc / plain_text 留空，由應用程式 lazy 重編或 recompileAll 補上
-- source_hash 與 @sao-blog/mdx 的 hashSource 相同：UTF-8 內容的 SHA-256 hex
INSERT INTO "post_translations" ("id", "post_id", "locale", "title", "summary", "content", "status", "is_source", "translated_by", "source_hash", "created_at", "updated_at")
SELECT gen_random_uuid(), p."id", 'zh-TW', p."title", p."summary", p."content", p."status", true, 'human',
       encode(sha256(convert_to(p."content", 'UTF8')), 'hex'), p."created_at", p."updated_at"
FROM "posts" p
ON CONFLICT ("post_id", "locale") DO NOTHING;--> statement-breakpoint
INSERT INTO "note_translations" ("id", "note_id", "locale", "title", "content", "status", "is_source", "translated_by", "source_hash", "created_at", "updated_at")
SELECT gen_random_uuid(), n."id", 'zh-TW', n."title", n."content", n."status", true, 'human',
       encode(sha256(convert_to(n."content", 'UTF8')), 'hex'), n."created_at", n."updated_at"
FROM "notes" n
ON CONFLICT ("note_id", "locale") DO NOTHING;--> statement-breakpoint
INSERT INTO "category_translations" ("id", "category_id", "locale", "name", "description", "created_at", "updated_at")
SELECT gen_random_uuid(), c."id", 'zh-TW', c."name", c."description", c."created_at", c."updated_at"
FROM "categories" c
ON CONFLICT ("category_id", "locale") DO NOTHING;
