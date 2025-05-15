CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`content` text NOT NULL,
	`image_url` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`sig` text,
	`nonce` text,
	`updated_at` integer,
	`read` integer DEFAULT false NOT NULL,
	`message_type` text DEFAULT 'text' NOT NULL,
	`payments` integer,
	`deleted` integer DEFAULT false,
	`sync_status` text DEFAULT 'pending',
	`read_status` text,
	`local_created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payments`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`amount` real NOT NULL,
	`transaction_hash` text NOT NULL,
	`status` text NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	FOREIGN KEY (`sender`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`username` text,
	`avatar_url` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`bio` text,
	`expo_push_token` text,
	`risk_threshold` integer DEFAULT 70,
	`risk_alerts_enabled` integer DEFAULT true,
	`wallets` integer,
	FOREIGN KEY (`wallets`) REFERENCES `wallets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_phone_unique` ON `profiles` (`phone`);--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`user1_id` text NOT NULL,
	`user2_id` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user1_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user2_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tx_risk_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`to_address` text NOT NULL,
	`amount` real NOT NULL,
	`program_ids` text,
	`risk_score` integer,
	`reason` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`owner` text NOT NULL,
	`wallet_number` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `profiles`(`id`) ON UPDATE cascade ON DELETE set null
);
