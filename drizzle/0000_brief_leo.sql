CREATE TABLE "ai_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_id" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "auth_accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "bucket_list_items" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_city_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"sender" text NOT NULL,
	"recipient" text NOT NULL,
	"sender_token" text NOT NULL,
	"recipient_token" text NOT NULL,
	"room_id" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_city_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter" text NOT NULL,
	"reported" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concierge_records" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"kind" text NOT NULL,
	"data_json" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "couple_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "couples" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_estimates" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text,
	"title" text NOT NULL,
	"data_json" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gifts" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "important_dates" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "love_letters" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_accounts" (
	"owner_id" text NOT NULL,
	"mode" text NOT NULL,
	"account_id" text NOT NULL,
	"country" text NOT NULL,
	"ready" integer DEFAULT 0 NOT NULL,
	"terms" text NOT NULL,
	"fee_bps" integer NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "marketplace_accounts_owner_id_mode_pk" PRIMARY KEY("owner_id","mode"),
	CONSTRAINT "marketplace_accounts_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "marketplace_events" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"buyer_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"product_id" text NOT NULL,
	"account_id" text NOT NULL,
	"mode" text NOT NULL,
	"country" text NOT NULL,
	"currency" text NOT NULL,
	"amount" integer NOT NULL,
	"fee" integer NOT NULL,
	"total" integer,
	"snapshot" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"session_id" text,
	"checkout_url" text,
	"payment_id" text,
	"address" text DEFAULT '{}' NOT NULL,
	"tracking" text DEFAULT '{}' NOT NULL,
	"support" text DEFAULT '' NOT NULL,
	"reserved" integer DEFAULT 1 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "marketplace_orders_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"object_key" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "media_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "media_blobs" (
	"object_key" text PRIMARY KEY NOT NULL,
	"content" bytea NOT NULL,
	"content_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"data_json" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"inviter_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" text NOT NULL,
	"accepted_by" text,
	"created_at" text NOT NULL,
	CONSTRAINT "partner_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_id" text,
	"title" text NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"data_json" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"subscription_json" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_records" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"kind" text NOT NULL,
	"country" text NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"data_json" text NOT NULL,
	"review_note" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_gifts" (
	"order_id" text PRIMARY KEY NOT NULL,
	"sender_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"message" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_memberships" (
	"payment_mode" text DEFAULT 'test' NOT NULL,
	"owner_id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"status" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"cancel_at_end" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "shop_memberships_subscription_id_unique" UNIQUE("subscription_id")
);
--> statement-breakpoint
CREATE TABLE "shop_orders" (
	"payment_mode" text DEFAULT 'test' NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"sku" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text NOT NULL,
	"details" text DEFAULT '{}' NOT NULL,
	"session_id" text,
	"payment_id" text,
	"checkout_url" text,
	"created_at" bigint NOT NULL,
	CONSTRAINT "shop_orders_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "shop_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_world_settings" (
	"couple_id" text PRIMARY KEY NOT NULL,
	"theme" text NOT NULL,
	"owner_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surprises" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "together_passports" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"data_json" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "together_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"week" text NOT NULL,
	"data_json" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"profile_json" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wish_pins" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"remind_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" text PRIMARY KEY NOT NULL,
	"couple_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"data_json" text NOT NULL,
	"secret" integer DEFAULT 1 NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_blocks" (
	"room_id" text NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"z" integer NOT NULL,
	"material" text NOT NULL,
	"owner_id" text NOT NULL,
	CONSTRAINT "world_blocks_room_id_x_y_z_pk" PRIMARY KEY("room_id","x","y","z")
);
--> statement-breakpoint
CREATE TABLE "world_people_blocks" (
	"user_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "world_people_blocks_user_id_blocked_id_pk" PRIMARY KEY("user_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "world_calls" (
	"room_id" text PRIMARY KEY NOT NULL,
	"id" text NOT NULL,
	"caller_id" text NOT NULL,
	"callee_id" text NOT NULL,
	"caller_token" text NOT NULL,
	"callee_token" text NOT NULL,
	"state" text NOT NULL,
	"offer" text DEFAULT '' NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"created_at" bigint NOT NULL,
	"caller_seen" bigint NOT NULL,
	"callee_seen" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"user_id" text NOT NULL,
	"nickname" text NOT NULL,
	"message" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"couple_id" text,
	"created_at" bigint NOT NULL,
	"closed" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "world_rooms_couple_id_unique" UNIQUE("couple_id")
);
--> statement-breakpoint
CREATE TABLE "world_sessions" (
	"vehicle" integer DEFAULT 0 NOT NULL,
	"user_id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"room_id" text,
	"mode" text NOT NULL,
	"nickname" text NOT NULL,
	"avatar_json" text NOT NULL,
	"interests" integer DEFAULT 0 NOT NULL,
	"x" double precision DEFAULT 9 NOT NULL,
	"z" double precision DEFAULT 10 NOT NULL,
	"direction" double precision DEFAULT 0 NOT NULL,
	"emote" text DEFAULT '' NOT NULL,
	"emote_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bucket_list_items" ADD CONSTRAINT "bucket_list_items_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bucket_list_items" ADD CONSTRAINT "bucket_list_items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_city_invites" ADD CONSTRAINT "world_city_invites_sender_users_id_fk" FOREIGN KEY ("sender") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_city_invites" ADD CONSTRAINT "world_city_invites_recipient_users_id_fk" FOREIGN KEY ("recipient") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_city_invites" ADD CONSTRAINT "world_city_invites_room_id_world_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."world_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_city_reports" ADD CONSTRAINT "world_city_reports_reporter_users_id_fk" FOREIGN KEY ("reporter") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_city_reports" ADD CONSTRAINT "world_city_reports_reported_users_id_fk" FOREIGN KEY ("reported") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concierge_records" ADD CONSTRAINT "concierge_records_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couple_goals" ADD CONSTRAINT "couple_goals_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couple_goals" ADD CONSTRAINT "couple_goals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_estimates" ADD CONSTRAINT "delivery_estimates_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_estimates" ADD CONSTRAINT "delivery_estimates_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "important_dates" ADD CONSTRAINT "important_dates_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "important_dates" ADD CONSTRAINT "important_dates_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "love_letters" ADD CONSTRAINT "love_letters_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "love_letters" ADD CONSTRAINT "love_letters_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_invitations" ADD CONSTRAINT "partner_invitations_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_invitations" ADD CONSTRAINT "partner_invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_records" ADD CONSTRAINT "seller_records_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping" ADD CONSTRAINT "shipping_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping" ADD CONSTRAINT "shipping_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_gifts" ADD CONSTRAINT "shop_gifts_order_id_shop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shop_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_gifts" ADD CONSTRAINT "shop_gifts_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_gifts" ADD CONSTRAINT "shop_gifts_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_memberships" ADD CONSTRAINT "shop_memberships_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_world_settings" ADD CONSTRAINT "shop_world_settings_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_world_settings" ADD CONSTRAINT "shop_world_settings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surprises" ADD CONSTRAINT "surprises_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surprises" ADD CONSTRAINT "surprises_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "together_passports" ADD CONSTRAINT "together_passports_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "together_passports" ADD CONSTRAINT "together_passports_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "together_plans" ADD CONSTRAINT "together_plans_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "together_plans" ADD CONSTRAINT "together_plans_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish_pins" ADD CONSTRAINT "wish_pins_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish_pins" ADD CONSTRAINT "wish_pins_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_blocks" ADD CONSTRAINT "world_blocks_room_id_world_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."world_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_blocks" ADD CONSTRAINT "world_blocks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_people_blocks" ADD CONSTRAINT "world_people_blocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_people_blocks" ADD CONSTRAINT "world_people_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_calls" ADD CONSTRAINT "world_calls_room_id_world_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."world_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_calls" ADD CONSTRAINT "world_calls_caller_id_users_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_calls" ADD CONSTRAINT "world_calls_callee_id_users_id_fk" FOREIGN KEY ("callee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_messages" ADD CONSTRAINT "world_messages_room_id_world_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."world_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_messages" ADD CONSTRAINT "world_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_rooms" ADD CONSTRAINT "world_rooms_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_sessions" ADD CONSTRAINT "world_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_sessions" ADD CONSTRAINT "world_sessions_room_id_world_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."world_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_couple_privacy" ON "ai_recommendations" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_owner" ON "ai_recommendations" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_audit_actor_created" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_auth_sessions_user" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_auth_sessions_expires" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_bucket_list_items_couple_privacy" ON "bucket_list_items" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_bucket_list_items_owner" ON "bucket_list_items" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_calendar_events_couple_privacy" ON "calendar_events" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_calendar_events_owner" ON "calendar_events" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_city_invites_recipient" ON "world_city_invites" USING btree ("recipient","created_at");--> statement-breakpoint
CREATE INDEX "idx_city_invites_sender" ON "world_city_invites" USING btree ("sender","created_at");--> statement-breakpoint
CREATE INDEX "idx_city_reports_reporter" ON "world_city_reports" USING btree ("reporter","created_at");--> statement-breakpoint
CREATE INDEX "idx_concierge_owner_kind" ON "concierge_records" USING btree ("owner_id","kind");--> statement-breakpoint
CREATE INDEX "idx_couple_goals_couple_privacy" ON "couple_goals" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_couple_goals_owner" ON "couple_goals" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_delivery_estimates_couple_privacy" ON "delivery_estimates" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_delivery_estimates_owner" ON "delivery_estimates" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_gifts_couple_privacy" ON "gifts" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_gifts_owner" ON "gifts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_important_dates_couple_privacy" ON "important_dates" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_important_dates_owner" ON "important_dates" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_love_letters_couple_privacy" ON "love_letters" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_love_letters_owner" ON "love_letters" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_marketplace_buyer" ON "marketplace_orders" USING btree ("buyer_id","mode","created_at");--> statement-breakpoint
CREATE INDEX "idx_marketplace_seller" ON "marketplace_orders" USING btree ("seller_id","mode","created_at");--> statement-breakpoint
CREATE INDEX "idx_marketplace_payment" ON "marketplace_orders" USING btree ("account_id","payment_id");--> statement-breakpoint
CREATE INDEX "idx_media_owner" ON "media" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_media_couple" ON "media" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "idx_memories_couple_privacy" ON "memories" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_memories_owner" ON "memories" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_messages_couple_privacy" ON "messages" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_messages_owner" ON "messages" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_couple_privacy" ON "notifications" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_notifications_owner" ON "notifications" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_orders_couple_privacy" ON "orders" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_orders_owner" ON "orders" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_invitations_couple" ON "partner_invitations" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "idx_payments_couple_privacy" ON "payments" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_payments_owner" ON "payments" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_preferences_couple_privacy" ON "preferences" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_preferences_owner" ON "preferences" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_settings_couple_privacy" ON "privacy_settings" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_privacy_settings_owner" ON "privacy_settings" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_products_merchant" ON "products" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "idx_push_owner" ON "push_subscriptions" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_seller_owner_kind" ON "seller_records" USING btree ("owner_id","kind");--> statement-breakpoint
CREATE INDEX "idx_seller_status_kind" ON "seller_records" USING btree ("status","kind");--> statement-breakpoint
CREATE INDEX "idx_shipping_couple_privacy" ON "shipping" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_shipping_owner" ON "shipping" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_shop_gifts_recipient" ON "shop_gifts" USING btree ("recipient_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_shop_orders_owner" ON "shop_orders" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_shop_orders_payment" ON "shop_orders" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_surprises_couple_privacy" ON "surprises" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_surprises_owner" ON "surprises" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_together_passport_couple" ON "together_passports" USING btree ("couple_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_together_plan_week" ON "together_plans" USING btree ("couple_id","week");--> statement-breakpoint
CREATE INDEX "idx_together_plan_owner" ON "together_plans" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_users_couple" ON "users" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "idx_wish_pins_couple_privacy" ON "wish_pins" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_wish_pins_owner" ON "wish_pins" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_wish_pins_remind_status" ON "wish_pins" USING btree ("status","remind_at");--> statement-breakpoint
CREATE INDEX "idx_wishlist_items_couple_privacy" ON "wishlist_items" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_wishlist_items_owner" ON "wishlist_items" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_wishlists_couple_privacy" ON "wishlists" USING btree ("couple_id","secret");--> statement-breakpoint
CREATE INDEX "idx_wishlists_owner" ON "wishlists" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_world_blocks_owner" ON "world_blocks" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_world_people_blocks_target" ON "world_people_blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "idx_world_messages_room_time" ON "world_messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_world_messages_user_time" ON "world_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_world_sessions_room" ON "world_sessions" USING btree ("room_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_world_sessions_waiting" ON "world_sessions" USING btree ("mode","room_id","updated_at");