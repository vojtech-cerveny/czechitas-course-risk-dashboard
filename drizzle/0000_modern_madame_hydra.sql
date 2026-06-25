CREATE TABLE `courses` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`theme` text,
	`format` text,
	`length` text,
	`participant_group` text,
	`place` text,
	`month` text,
	`year` integer,
	`start_at` text,
	`end_at` text,
	`state` text NOT NULL,
	`state_label` text,
	`capacity` integer,
	`max_capacity` integer,
	`registration_deadline` text,
	`deadline_source` text,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer NOT NULL,
	`captured_at` integer NOT NULL,
	`phase2_pct` integer,
	`phase3_pct` integer,
	`phase4_pct` integer,
	`phase3_severity` text,
	`registered_count` integer,
	`capacity` integer,
	`state` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_snapshots_course` ON `snapshots` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_snapshots_course_time` ON `snapshots` (`course_id`,`captured_at`);