DROP INDEX "comments_post_id_idx";--> statement-breakpoint
DROP INDEX "comments_post_created_idx";--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "type" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "ref_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "comments_ref_id_idx" ON "comments" USING btree ("ref_id");--> statement-breakpoint
CREATE INDEX "comments_ref_created_idx" ON "comments" USING btree ("ref_id","created_at");--> statement-breakpoint
ALTER TABLE "comments" DROP COLUMN "post_id";