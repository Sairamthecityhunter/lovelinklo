CREATE TABLE `world_blocks` (
	`room_id` text NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`z` integer NOT NULL,
	`material` text NOT NULL,
	`owner_id` text NOT NULL,
	PRIMARY KEY(`room_id`, `x`, `y`, `z`),
	FOREIGN KEY (`room_id`) REFERENCES `world_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_world_blocks_owner` ON `world_blocks` (`owner_id`);--> statement-breakpoint
CREATE TABLE `world_people_blocks` (
	`user_id` text NOT NULL,
	`blocked_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `blocked_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`blocked_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_world_people_blocks_target` ON `world_people_blocks` (`blocked_id`);--> statement-breakpoint
CREATE TABLE `world_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`nickname` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `world_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_world_messages_room_time` ON `world_messages` (`room_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_world_messages_user_time` ON `world_messages` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `world_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`couple_id` text,
	`created_at` integer NOT NULL,
	`closed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `world_rooms_couple_id_unique` ON `world_rooms` (`couple_id`);--> statement-breakpoint
CREATE TABLE `world_sessions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`room_id` text,
	`mode` text NOT NULL,
	`nickname` text NOT NULL,
	`avatar_json` text NOT NULL,
	`interests` integer DEFAULT 0 NOT NULL,
	`x` real DEFAULT 9 NOT NULL,
	`z` real DEFAULT 10 NOT NULL,
	`direction` real DEFAULT 0 NOT NULL,
	`emote` text DEFAULT '' NOT NULL,
	`emote_at` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `world_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_world_sessions_room` ON `world_sessions` (`room_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_world_sessions_waiting` ON `world_sessions` (`mode`,`room_id`,`updated_at`);