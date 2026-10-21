CREATE TYPE "public"."comment_block_type" AS ENUM('ip', 'email', 'keyword');--> statement-breakpoint
CREATE TYPE "public"."comment_status" AS ENUM('pending', 'approved', 'spam', 'rejected');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_blocklist" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "comment_block_type" NOT NULL,
	"value" varchar(512) NOT NULL,
	"note" varchar(256),
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "status" "comment_status" DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "flag_reason" varchar(64);--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "moderated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "moderated_by" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "comment_blocklist_type_value_idx" ON "comment_blocklist" USING btree ("type","value");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_moderated_by_user_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_status_idx" ON "comments" USING btree ("status");