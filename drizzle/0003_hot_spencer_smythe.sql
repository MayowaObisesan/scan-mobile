PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`content` text NOT NULL,
	`image_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`sig` text,
	`nonce` text,
	`updated_at` text,
	`read` integer DEFAULT false NOT NULL,
	`message_type` text DEFAULT 'text' NOT NULL,
	`payments` integer,
	`deleted` integer DEFAULT false,
	`sync_status` text DEFAULT 'pending',
	`read_status` text DEFAULT 'pending',
	`local_created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payments`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "thread_id", "sender_id", "content", "image_url", "created_at", "sig", "nonce", "updated_at", "read", "message_type", "payments", "deleted", "sync_status", "read_status", "local_created_at") SELECT "id", "thread_id", "sender_id", "content", "image_url", "created_at", "sig", "nonce", "updated_at", "read", "message_type", "payments", "deleted", "sync_status", "read_status", "local_created_at" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;