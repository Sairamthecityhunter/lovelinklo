CREATE TABLE `world_calls` (
	`room_id` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`caller_id` text NOT NULL,
	`callee_id` text NOT NULL,
	`caller_token` text NOT NULL,
	`callee_token` text NOT NULL,
	`state` text NOT NULL,
	`offer` text DEFAULT '' NOT NULL,
	`answer` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`caller_seen` integer NOT NULL,
	`callee_seen` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `world_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`caller_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`callee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
