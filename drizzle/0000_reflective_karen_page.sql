CREATE TABLE `ai_recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ai_recommendations_couple_privacy` ON `ai_recommendations` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_ai_recommendations_owner` ON `ai_recommendations` (`owner_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`resource_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_actor_created` ON `audit_logs` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `bucket_list_items` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_bucket_list_items_couple_privacy` ON `bucket_list_items` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_bucket_list_items_owner` ON `bucket_list_items` (`owner_id`);--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_calendar_events_couple_privacy` ON `calendar_events` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_calendar_events_owner` ON `calendar_events` (`owner_id`);--> statement-breakpoint
CREATE TABLE `couple_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_couple_goals_couple_privacy` ON `couple_goals` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_couple_goals_owner` ON `couple_goals` (`owner_id`);--> statement-breakpoint
CREATE TABLE `couples` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `delivery_estimates` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_delivery_estimates_couple_privacy` ON `delivery_estimates` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_delivery_estimates_owner` ON `delivery_estimates` (`owner_id`);--> statement-breakpoint
CREATE TABLE `experiences` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text,
	`title` text NOT NULL,
	`data_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gifts` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_gifts_couple_privacy` ON `gifts` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_gifts_owner` ON `gifts` (`owner_id`);--> statement-breakpoint
CREATE TABLE `important_dates` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_important_dates_couple_privacy` ON `important_dates` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_important_dates_owner` ON `important_dates` (`owner_id`);--> statement-breakpoint
CREATE TABLE `love_letters` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_love_letters_couple_privacy` ON `love_letters` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_love_letters_owner` ON `love_letters` (`owner_id`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_object_key_unique` ON `media` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_media_owner` ON `media` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_media_couple` ON `media` (`couple_id`);--> statement-breakpoint
CREATE TABLE `memories` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_memories_couple_privacy` ON `memories` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_memories_owner` ON `memories` (`owner_id`);--> statement-breakpoint
CREATE TABLE `merchants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`data_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_messages_couple_privacy` ON `messages` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_messages_owner` ON `messages` (`owner_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_couple_privacy` ON `notifications` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_notifications_owner` ON `notifications` (`owner_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_orders_couple_privacy` ON `orders` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_orders_owner` ON `orders` (`owner_id`);--> statement-breakpoint
CREATE TABLE `partner_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`inviter_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`accepted_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inviter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partner_invitations_token_hash_unique` ON `partner_invitations` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_invitations_couple` ON `partner_invitations` (`couple_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_payments_couple_privacy` ON `payments` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_payments_owner` ON `payments` (`owner_id`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_preferences_couple_privacy` ON `preferences` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_preferences_owner` ON `preferences` (`owner_id`);--> statement-breakpoint
CREATE TABLE `privacy_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_privacy_settings_couple_privacy` ON `privacy_settings` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_privacy_settings_owner` ON `privacy_settings` (`owner_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text,
	`title` text NOT NULL,
	`price_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`data_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_products_merchant` ON `products` (`merchant_id`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`subscription_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_push_owner` ON `push_subscriptions` (`owner_id`);--> statement-breakpoint
CREATE TABLE `shipping` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_shipping_couple_privacy` ON `shipping` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_shipping_owner` ON `shipping` (`owner_id`);--> statement-breakpoint
CREATE TABLE `surprises` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_surprises_couple_privacy` ON `surprises` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_surprises_owner` ON `surprises` (`owner_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`profile_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_users_couple` ON `users` (`couple_id`);--> statement-breakpoint
CREATE TABLE `wish_pins` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`remind_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_wish_pins_couple_privacy` ON `wish_pins` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_wish_pins_owner` ON `wish_pins` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_wish_pins_remind_status` ON `wish_pins` (`status`,`remind_at`);--> statement-breakpoint
CREATE TABLE `wishlist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_wishlist_items_couple_privacy` ON `wishlist_items` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_wishlist_items_owner` ON `wishlist_items` (`owner_id`);--> statement-breakpoint
CREATE TABLE `wishlists` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`secret` integer DEFAULT true NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_wishlists_couple_privacy` ON `wishlists` (`couple_id`,`secret`);--> statement-breakpoint
CREATE INDEX `idx_wishlists_owner` ON `wishlists` (`owner_id`);