CREATE INDEX "notes_status_idx" ON "notes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notes_created_idx" ON "notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notes_status_created_idx" ON "notes" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "notes_author_idx" ON "notes" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "notes_topic_idx" ON "notes" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "topics_slug_idx" ON "topics" USING btree ("slug");