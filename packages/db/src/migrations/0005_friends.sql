CREATE TYPE "public"."friend_fetch_status" AS ENUM('ok', 'error', 'not_modified');--> statement-breakpoint
CREATE TYPE "public"."friend_status" AS ENUM('pending', 'approved', 'rejected', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."summary_source" AS ENUM('ai', 'feed', 'manual', 'none');--> statement-breakpoint
CREATE TABLE "friend_articles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"friend_id" uuid NOT NULL,
	"link" varchar(1000) NOT NULL,
	"title" varchar(300) NOT NULL,
	"published_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"summary" text,
	"summary_source" "summary_source" DEFAULT 'none' NOT NULL,
	"summary_model" varchar(100),
	"content_hash" varchar(64),
	"hidden" boolean DEFAULT false NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	CONSTRAINT "friend_articles_link_unique" UNIQUE("link")
);
--> statement-breakpoint
CREATE TABLE "friends" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"url" varchar(500) NOT NULL,
	"avatar" varchar(500),
	"description" varchar(200),
	"feed_url" varchar(500),
	"email" varchar(255),
	"backlink_url" varchar(500),
	"status" "friend_status" DEFAULT 'pending' NOT NULL,
	"circle_enabled" boolean DEFAULT true NOT NULL,
	"group" varchar(50) DEFAULT 'friend' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"apply_ip" varchar(45),
	"apply_ua" varchar(500),
	"fetch_status" "friend_fetch_status",
	"fetch_error" text,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"etag" varchar(200),
	"last_modified" varchar(100),
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "friends_url_unique" UNIQUE("url")
);
--> statement-breakpoint
ALTER TABLE "friend_articles" ADD CONSTRAINT "friend_articles_friend_id_friends_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."friends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "friend_articles_friend_pub_idx" ON "friend_articles" USING btree ("friend_id","published_at");--> statement-breakpoint
CREATE INDEX "friend_articles_pub_idx" ON "friend_articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "friends_status_idx" ON "friends" USING btree ("status");--> statement-breakpoint
CREATE INDEX "friends_group_sort_idx" ON "friends" USING btree ("group","sort_order");