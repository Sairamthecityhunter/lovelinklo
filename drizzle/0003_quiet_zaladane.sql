CREATE TABLE `shop_gifts` (
	`order_id` text PRIMARY KEY NOT NULL,
	`sender_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `shop_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_shop_gifts_recipient` ON `shop_gifts` (`recipient_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `shop_memberships` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`status` text NOT NULL,
	`expires_at` integer NOT NULL,
	`cancel_at_end` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shop_memberships_subscription_id_unique` ON `shop_memberships` (`subscription_id`);--> statement-breakpoint
CREATE TABLE `shop_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`sku` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text NOT NULL,
	`details` text DEFAULT '{}' NOT NULL,
	`session_id` text,
	`payment_id` text,
	`checkout_url` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shop_orders_session_id_unique` ON `shop_orders` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_shop_orders_owner` ON `shop_orders` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_shop_orders_payment` ON `shop_orders` (`payment_id`);--> statement-breakpoint
CREATE TABLE `shop_webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shop_world_settings` (
	`couple_id` text PRIMARY KEY NOT NULL,
	`theme` text NOT NULL,
	`owner_id` text NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
