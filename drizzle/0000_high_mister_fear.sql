CREATE TABLE `meals` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`meal_date` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `meals_user_date_idx` ON `meals` (`user_id`,`meal_date`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL
);
