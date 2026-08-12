CREATE TABLE `price_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`asset_class` text NOT NULL,
	`asset_id` text NOT NULL,
	`label` text NOT NULL,
	`symbol` text,
	`direction` text NOT NULL,
	`threshold` real NOT NULL,
	`currency` text NOT NULL,
	`email` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`triggered_at` integer,
	`triggered_price` real,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `alerts_active_idx` ON `price_alerts` (`active`,`asset_class`,`asset_id`);--> statement-breakpoint
CREATE INDEX `alerts_user_idx` ON `price_alerts` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `saved_screens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`criteria` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `screens_user_name_idx` ON `saved_screens` (`user_id`,`name`);--> statement-breakpoint
CREATE INDEX `screens_user_idx` ON `saved_screens` (`user_id`,`created_at`);--> statement-breakpoint
DROP INDEX `watchlist_user_asset_idx`;--> statement-breakpoint
ALTER TABLE `watchlist_items` ADD `list_name` text DEFAULT 'Ma liste' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `watchlist_user_list_asset_idx` ON `watchlist_items` (`user_id`,`list_name`,`asset_class`,`asset_id`);