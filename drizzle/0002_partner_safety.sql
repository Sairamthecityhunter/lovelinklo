CREATE TABLE "partner_blocks" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "partner_blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "partner_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"reported_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "flagged_for_review" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_blocks" ADD CONSTRAINT "partner_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_blocks" ADD CONSTRAINT "partner_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_reports" ADD CONSTRAINT "partner_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_reports" ADD CONSTRAINT "partner_reports_reported_id_users_id_fk" FOREIGN KEY ("reported_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_partner_blocks_blocked" ON "partner_blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "idx_partner_reports_reporter" ON "partner_reports" USING btree ("reporter_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_partner_reports_reported" ON "partner_reports" USING btree ("reported_id","status");