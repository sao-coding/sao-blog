ALTER TABLE "topics" ALTER COLUMN "description" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "description" DROP NOT NULL;