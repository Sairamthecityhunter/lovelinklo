CREATE TABLE "couple_plans" (
	"couple_id" text PRIMARY KEY NOT NULL,
	"tier" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"payment_mode" text DEFAULT 'demo' NOT NULL,
	"started_by" text NOT NULL,
	"started_at" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"cancel_at_end" integer DEFAULT 0 NOT NULL,
	"subscription_id" text,
	"customer_id" text,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "couple_plans" ADD CONSTRAINT "couple_plans_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couple_plans" ADD CONSTRAINT "couple_plans_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "couple_plans_subscription_unique" ON "couple_plans" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_couple_plans_status" ON "couple_plans" USING btree ("status","expires_at");--> statement-breakpoint
CREATE TABLE "gift_payment_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"gift_order_id" text NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"total_cents" integer NOT NULL,
	"installment_count" integer NOT NULL,
	"split_with_partner" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"payment_mode" text DEFAULT 'demo' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gift_payment_plans" ADD CONSTRAINT "gift_payment_plans_gift_order_id_gift_orders_id_fk" FOREIGN KEY ("gift_order_id") REFERENCES "public"."gift_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_payment_plans" ADD CONSTRAINT "gift_payment_plans_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_payment_plans" ADD CONSTRAINT "gift_payment_plans_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gift_payment_plans_order_unique" ON "gift_payment_plans" USING btree ("gift_order_id");--> statement-breakpoint
CREATE INDEX "idx_gift_payment_plans_couple" ON "gift_payment_plans" USING btree ("couple_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_gift_payment_plans_owner" ON "gift_payment_plans" USING btree ("owner_id");--> statement-breakpoint
CREATE TABLE "gift_plan_installments" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"due_on" text NOT NULL,
	"assigned_user_id" text,
	"status" text DEFAULT 'due' NOT NULL,
	"paid_by" text,
	"paid_at" text,
	"payment_mode" text DEFAULT 'pending' NOT NULL,
	"session_id" text,
	"checkout_url" text
);
--> statement-breakpoint
ALTER TABLE "gift_plan_installments" ADD CONSTRAINT "gift_plan_installments_plan_id_gift_payment_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."gift_payment_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_plan_installments" ADD CONSTRAINT "gift_plan_installments_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_plan_installments" ADD CONSTRAINT "gift_plan_installments_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gift_plan_installments_sequence_unique" ON "gift_plan_installments" USING btree ("plan_id","sequence");--> statement-breakpoint
CREATE INDEX "idx_gift_plan_installments_assignee" ON "gift_plan_installments" USING btree ("assigned_user_id","status");
