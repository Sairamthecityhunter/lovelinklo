CREATE TABLE "couple_trips" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"destination" text NOT NULL,
	"start_date" text,
	"end_date" text,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'idea' NOT NULL,
	"visibility" integer DEFAULT 100 NOT NULL,
	"special_day_id" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "couple_trips" ADD CONSTRAINT "couple_trips_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couple_trips" ADD CONSTRAINT "couple_trips_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couple_trips" ADD CONSTRAINT "couple_trips_special_day_id_special_days_id_fk" FOREIGN KEY ("special_day_id") REFERENCES "public"."special_days"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_couple_trips_couple" ON "couple_trips" USING btree ("couple_id","start_date");--> statement-breakpoint
CREATE INDEX "idx_couple_trips_owner" ON "couple_trips" USING btree ("owner_id");
