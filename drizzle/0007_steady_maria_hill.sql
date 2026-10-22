CREATE TABLE `together_passports` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`data_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_together_passport_couple` ON `together_passports` (`couple_id`);--> statement-breakpoint
CREATE TABLE `together_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`week` text NOT NULL,
	`data_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_together_plan_week` ON `together_plans` (`couple_id`,`week`);--> statement-breakpoint
CREATE INDEX `idx_together_plan_owner` ON `together_plans` (`owner_id`);