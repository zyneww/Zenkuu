CREATE TABLE `user_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`currency` text,
	`theme` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `watchlist_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`asset_class` text NOT NULL,
	`asset_id` text NOT NULL,
	`label` text NOT NULL,
	`symbol` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watchlist_user_asset_idx` ON `watchlist_items` (`user_id`,`asset_class`,`asset_id`);--> statement-breakpoint
CREATE INDEX `watchlist_user_idx` ON `watchlist_items` (`user_id`,`created_at`);