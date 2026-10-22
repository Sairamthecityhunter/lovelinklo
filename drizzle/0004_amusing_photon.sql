ALTER TABLE `shop_memberships` ADD `payment_mode` text DEFAULT 'test' NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_orders` ADD `payment_mode` text DEFAULT 'test' NOT NULL;