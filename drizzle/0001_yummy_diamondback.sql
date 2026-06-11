CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`model_type` text,
	`model_id` text,
	`user_id` text,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`ext` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`collection` text DEFAULT 'default' NOT NULL,
	`url` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_key_unique` ON `media` (`key`);--> statement-breakpoint
CREATE INDEX `media_model_idx` ON `media` (`model_type`,`model_id`);--> statement-breakpoint
CREATE INDEX `media_collection_idx` ON `media` (`model_type`,`model_id`,`collection`);--> statement-breakpoint
CREATE INDEX `media_userId_idx` ON `media` (`user_id`);