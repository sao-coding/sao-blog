CREATE TABLE "home_strokes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"day" varchar(10) NOT NULL,
	"pigment" varchar(16) NOT NULL,
	"points" jsonb NOT NULL,
	"ink" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "home_strokes" ADD CONSTRAINT "home_strokes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "home_strokes_day_idx" ON "home_strokes" USING btree ("day","created_at");--> statement-breakpoint
CREATE INDEX "home_strokes_user_day_idx" ON "home_strokes" USING btree ("user_id","day");