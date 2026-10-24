ALTER TABLE "couple_notes" ADD COLUMN "status" text DEFAULT 'sent' NOT NULL;--> statement-breakpoint
ALTER TABLE "couple_notes" ADD COLUMN "visibility" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "couple_notes" ADD COLUMN "updated_at" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "couple_notes" ADD COLUMN "sent_at" text;--> statement-breakpoint
ALTER TABLE "couple_notes" ADD COLUMN "special_day_id" text;--> statement-breakpoint
ALTER TABLE "special_days" ADD COLUMN "visibility" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "couple_notes" ADD CONSTRAINT "couple_notes_special_day_id_special_days_id_fk" FOREIGN KEY ("special_day_id") REFERENCES "public"."special_days"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_couple_notes_status" ON "couple_notes" USING btree ("status","special_day_id");--> statement-breakpoint
UPDATE "couple_notes" SET "updated_at" = "created_at" WHERE "updated_at" = '';--> statement-breakpoint
UPDATE "couple_notes" SET "sent_at" = "created_at" WHERE "status" = 'sent' AND "sent_at" IS NULL;--> statement-breakpoint
UPDATE "special_days" SET "visibility" = 25 WHERE "type" = 'birthday';--> statement-breakpoint
UPDATE "special_days" SET "visibility" = 50 WHERE "type" = 'anniversary';