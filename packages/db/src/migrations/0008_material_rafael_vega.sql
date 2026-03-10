CREATE TYPE "public"."comment_source" AS ENUM('guest', 'google', 'github');--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "source" SET DEFAULT 'guest'::"public"."comment_source";--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "source" SET DATA TYPE "public"."comment_source" USING "source"::"public"."comment_source";