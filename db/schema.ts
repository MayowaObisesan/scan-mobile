// db/schema.ts
import { sql } from "drizzle-orm";
import {
  text,
  integer,
  sqliteTable,
  numeric,
  real,
  primaryKey
} from "drizzle-orm/sqlite-core";
import uuid from "uuid";
import * as Crypto from "expo-crypto";

// Messages table
export const messages = sqliteTable('messages', {
  id: text('id').$defaultFn(() => Crypto.randomUUID()).primaryKey(),
  threadId: text('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  sig: text('sig'),
  nonce: text('nonce'),
  updatedAt: text('updated_at'),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  messageType: text('message_type').notNull().default('text'),
  payments: integer('payments').references(() => payments.id),
  deleted: integer('deleted', { mode: 'boolean' }).default(false),
  syncStatus: text('sync_status').default('pending'),
  readStatus: text('read_status').default('pending'),
  localCreatedAt: text('local_created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Threads table
export const threads = sqliteTable('threads', {
  id: text('id').primaryKey(),
  user1Id: text('user1_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  user2Id: text('user2_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
});

// Payments table
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  amount: real('amount').notNull(),
  transactionHash: text('transaction_hash').notNull(),
  status: text('status').notNull(),
  sender: text('sender').notNull().references(() => profiles.id),
  recipient: text('recipient').notNull().references(() => profiles.id)
});

// Profiles table
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  phone: text('phone').notNull().unique(),
  username: text('username'),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  bio: text('bio'),
  expoPushToken: text('expo_push_token'),
  riskThreshold: integer('risk_threshold').default(70),
  riskAlertsEnabled: integer('risk_alerts_enabled', { mode: 'boolean' }).default(true),
  wallets: integer('wallets').references(() => wallets.id)
});

// Wallets table
export const wallets = sqliteTable('wallets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  owner: text('owner').notNull().references(() => profiles.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  walletNumber: text('wallet_number').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false)
});

// Risk Logs table
export const txRiskLogs = sqliteTable('tx_risk_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => profiles.id, { onDelete: 'cascade' }),
  toAddress: text('to_address').notNull(),
  amount: real('amount').notNull(),
  programIds: text('program_ids'), // SQLite doesn't support arrays, store as JSON string
  riskScore: integer('risk_score'),
  reason: text('reason'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
});

// Export types
export type Message = typeof messages.$inferSelect;
export type MessageWithDecryptedMessage = Message & {decryptedContent: string; encrypted:boolean};
export type NewMessage = typeof messages.$inferInsert;
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type TxRiskLog = typeof txRiskLogs.$inferSelect;
export type NewTxRiskLog = typeof txRiskLogs.$inferInsert;
