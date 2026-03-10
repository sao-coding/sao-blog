DROP INDEX "comment_likes";--> statement-breakpoint
CREATE INDEX "comment_idx" ON "comment_likes" USING btree ("comment_id");