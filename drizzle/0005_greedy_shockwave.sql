CREATE TABLE `world_city_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`sender_token` text NOT NULL,
	`recipient_token` text NOT NULL,
	`room_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`sender`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `world_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_city_invites_recipient` ON `world_city_invites` (`recipient`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_city_invites_sender` ON `world_city_invites` (`sender`,`created_at`);--> statement-breakpoint
CREATE TABLE `world_city_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter` text NOT NULL,
	`reported` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`reporter`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reported`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_city_reports_reporter` ON `world_city_reports` (`reporter`,`created_at`);--> statement-breakpoint
ALTER TABLE `world_sessions` ADD `vehicle` integer DEFAULT 0 NOT NULL;