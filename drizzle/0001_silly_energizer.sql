CREATE TABLE "auth_password_resets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" text NOT NULL,
	"used_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "auth_password_resets_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "couple_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_answers" (
	"couple_id" text NOT NULL,
	"day" text NOT NULL,
	"user_id" text NOT NULL,
	"mood" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "daily_answers_couple_id_day_user_id_pk" PRIMARY KEY("couple_id","day","user_id")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partner_invitations" ADD COLUMN "code_hash" text;--> statement-breakpoint
ALTER TABLE "auth_password_resets" ADD CONSTRAINT "auth_password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couple_notes" ADD CONSTRAINT "couple_notes_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couple_notes" ADD CONSTRAINT "couple_notes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_answers" ADD CONSTRAINT "daily_answers_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_answers" ADD CONSTRAINT "daily_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_password_resets_user" ON "auth_password_resets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_password_resets_expires" ON "auth_password_resets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_couple_notes_couple" ON "couple_notes" USING btree ("couple_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_daily_answers_couple_day" ON "daily_answers" USING btree ("couple_id","day");--> statement-breakpoint
ALTER TABLE "partner_invitations" ADD CONSTRAINT "partner_invitations_code_hash_unique" UNIQUE("code_hash");