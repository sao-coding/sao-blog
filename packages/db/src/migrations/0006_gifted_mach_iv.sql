ALTER TABLE "comments" ADD COLUMN "source" varchar(50) DEFAULT 'guest' NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "ip" varchar(45);--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "agent" varchar(512);--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "location" varchar(256);--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_user_idx" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comments_source_idx" ON "comments" USING btree ("source");