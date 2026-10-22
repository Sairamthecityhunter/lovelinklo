CREATE TABLE `marketplace_accounts` (
	`owner_id` text NOT NULL,
	`mode` text NOT NULL,
	`account_id` text NOT NULL,
	`country` text NOT NULL,
	`ready` integer DEFAULT 0 NOT NULL,
	`terms` text NOT NULL,
	`fee_bps` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `mode`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marketplace_accounts_account_id_unique` ON `marketplace_accounts` (`account_id`);--> statement-breakpoint
CREATE TABLE `marketplace_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `marketplace_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`product_id` text NOT NULL,
	`account_id` text NOT NULL,
	`mode` text NOT NULL,
	`country` text NOT NULL,
	`currency` text NOT NULL,
	`amount` integer NOT NULL,
	`fee` integer NOT NULL,
	`total` integer,
	`snapshot` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`session_id` text,
	`checkout_url` text,
	`payment_id` text,
	`address` text DEFAULT '{}' NOT NULL,
	`tracking` text DEFAULT '{}' NOT NULL,
	`support` text DEFAULT '' NOT NULL,
	`reserved` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marketplace_orders_session_id_unique` ON `marketplace_orders` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_marketplace_buyer` ON `marketplace_orders` (`buyer_id`,`mode`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_marketplace_seller` ON `marketplace_orders` (`seller_id`,`mode`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_marketplace_payment` ON `marketplace_orders` (`account_id`,`payment_id`);