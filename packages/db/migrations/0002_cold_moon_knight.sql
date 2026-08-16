CREATE TABLE IF NOT EXISTS `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`handle` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `accounts_email_idx` ON `accounts` (`email`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `login_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `login_codes_email_idx` ON `login_codes` (`email`,`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `news_articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text,
	`image_url` text,
	`source_id` text NOT NULL,
	`source_label` text NOT NULL,
	`category` text NOT NULL,
	`lang` text NOT NULL,
	`author` text,
	`published_at` integer NOT NULL,
	`collected_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `news_url_idx` ON `news_articles` (`url`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `news_published_idx` ON `news_articles` (`published_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sessions_account_idx` ON `sessions` (`account_id`);--> statement-breakpoint
ALTER TABLE `price_alerts` ADD `title` text;--> statement-breakpoint
ALTER TABLE `price_alerts` ADD `note` text;--> statement-breakpoint
ALTER TABLE `price_alerts` ADD `recurring` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `price_alerts` ADD `expires_at` integer;