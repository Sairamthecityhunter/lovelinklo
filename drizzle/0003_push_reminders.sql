ALTER TABLE "users" ADD COLUMN "reminder_mode" text DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reminder_lead" text DEFAULT '1d' NOT NULL;--> statement-breakpoint
DROP TABLE "push_subscriptions";--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "push_subscriptions_user_id_endpoint_pk" PRIMARY KEY("user_id","endpoint"),
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "closeness" (
	"owner_user_id" text NOT NULL,
	"target_user_id" text NOT NULL,
	"level" integer NOT NULL,
	CONSTRAINT "closeness_owner_user_id_target_user_id_pk" PRIMARY KEY("owner_user_id","target_user_id")
);
--> statement-breakpoint
CREATE TABLE "special_days" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"person_user_id" text,
	"name" text,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"month" integer NOT NULL,
	"day" integer NOT NULL,
	"year" integer,
	"interests" text DEFAULT '[]' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sent_reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"special_day_id" text NOT NULL,
	"kind" text NOT NULL,
	"year" integer NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "sent_reminders_unique" UNIQUE("owner_user_id","special_day_id","kind","year")
);
--> statement-breakpoint
CREATE TABLE "push_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closeness" ADD CONSTRAINT "closeness_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closeness" ADD CONSTRAINT "closeness_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_days" ADD CONSTRAINT "special_days_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_days" ADD CONSTRAINT "special_days_person_user_id_users_id_fk" FOREIGN KEY ("person_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sent_reminders" ADD CONSTRAINT "sent_reminders_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sent_reminders" ADD CONSTRAINT "sent_reminders_special_day_id_special_days_id_fk" FOREIGN KEY ("special_day_id") REFERENCES "public"."special_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_outbox" ADD CONSTRAINT "push_outbox_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_push_user" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_closeness_target" ON "closeness" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "idx_special_days_owner" ON "special_days" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "idx_special_days_person" ON "special_days" USING btree ("person_user_id");--> statement-breakpoint
CREATE INDEX "idx_push_outbox_user" ON "push_outbox" USING btree ("user_id","created_at");
