CREATE TABLE "thinkings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"note_id" uuid,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "thinkings" ADD CONSTRAINT "thinkings_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thinkings" ADD CONSTRAINT "thinkings_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "thinkings_created_at_idx" ON "thinkings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "thinkings_note_idx" ON "thinkings" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "thinkings_author_idx" ON "thinkings" USING btree ("author_id");