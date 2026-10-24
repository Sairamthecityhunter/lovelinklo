CREATE TABLE "gift_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"product_id" text NOT NULL,
	"title" text NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"recipient_name" text NOT NULL,
	"recipient_user_id" text,
	"address_line1" text NOT NULL,
	"address_line2" text DEFAULT '' NOT NULL,
	"city" text NOT NULL,
	"region" text DEFAULT '' NOT NULL,
	"postal_code" text NOT NULL,
	"country" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"payment_mode" text DEFAULT 'pending' NOT NULL,
	"session_id" text,
	"checkout_url" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gift_orders" ADD CONSTRAINT "gift_orders_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_orders" ADD CONSTRAINT "gift_orders_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_orders" ADD CONSTRAINT "gift_orders_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_gift_orders_couple" ON "gift_orders" USING btree ("couple_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_gift_orders_owner" ON "gift_orders" USING btree ("owner_id");
