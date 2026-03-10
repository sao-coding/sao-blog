CREATE TABLE "comment_likes" (
	"user_id" varchar(256) NOT NULL,
	"comment_id" uuid NOT NULL,
	"like" boolean NOT NULL,
	CONSTRAINT "comment_likes_user_id_comment_id_pk" PRIMARY KEY("user_id","comment_id")
);
--> statement-breakpoint
DROP TABLE "rates" CASCADE;--> statement-breakpoint
CREATE INDEX "comment_likes" ON "comment_likes" USING btree ("comment_id");