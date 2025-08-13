CREATE TABLE `pastes` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`language` text,
	`title` text,
	`visibility` text DEFAULT 'unlisted' NOT NULL,
	`password_hash` text,
	`salt` text,
	`burn_after_read` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	`views` integer DEFAULT 0 NOT NULL,
	`ip_hash` text
);
--> statement-breakpoint
CREATE INDEX `pastes_expires_idx` ON `pastes` (`expires_at`);--> statement-breakpoint
CREATE INDEX `pastes_created_idx` ON `pastes` (`created_at`);--> statement-breakpoint
CREATE INDEX `pastes_visibility_idx` ON `pastes` (`visibility`);