// db/messages.ts
import {and, eq} from 'drizzle-orm';
import {
  messages,
  type Message,
  type NewMessage,
  Payment,
  NewPayment,
  payments,
  NewThread,
  Thread,
  threads
} from './schema';
import {db} from "~/db/index";
import {DBTables, ReadStatus, SyncStatus} from "~/types/enums";
import {ChatMessages} from "~/types";
import {fetchMessages} from "~/services/chat";
import { Alert } from 'react-native';
import {supabase} from "~/supabase/client";
import AsyncStorage from "expo-sqlite/kv-store";

export const messageRepository = {
  getThreadMessagesFromKVStore(threadId: string) {
    return AsyncStorage.getItemSync(`threadId:${threadId}`)
  },

  async saveThreadMessagesToKVStore(threadId: string): Promise<boolean> {
    try {
      AsyncStorage.setItem(`threadId:${threadId}`, JSON.stringify({lastOpened: Date.now()}))
      return true;
    } catch (e) {
      console.error(e as any);
      return false;
    }
  },

  async replaceAll(messages: NewMessage[]): Promise<void> {
    await this.deleteAll()
    await this.create(messages)
  },

  async create(message: NewMessage[]): Promise<Message[]> {
    const createdMessage = await db.insert(messages).values(message).returning();
    return createdMessage;
  },

  async createPayment(paymentData: NewPayment): Promise<Payment[]> {
    const createdPayment = await db.insert(payments).values(paymentData).returning();
    return createdPayment;
  },

  async updatePayment(payment: Partial<NewPayment>): Promise<Payment> {
    const updatedPayment = await db
        .update(payments)
        .set(payment)
        .where(eq(payments.id, payment.id!))
        .returning();

    return updatedPayment[0];
  },

  async getById(id: string): Promise<Message | null> {
    const message = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);
    return message[0] || null;
  },

  async update(message: NewMessage): Promise<Message> {
    const updatedMessage = await db
      .update(messages)
      .set(message)
      .where(eq(messages.id, message.id!))
      .returning();
    return updatedMessage[0];
  },

  async deleteById(id: string): Promise<Message[]> {
    // await db.delete(messages).where(eq(messages.id, id));
    // Perform soft delete, not real-delete incase the user wants to undo the delete.
    // This soft delete is done by setting the deleted column to true, and is only valid for 30 days.
    const deletedMessage = await db.update(messages).set({deleted: true}).where(eq(messages.id, id)).returning();
    console.log("Deleting local message by Id", deletedMessage[0]);
    return deletedMessage;
  },

  async deleteAll(): Promise<void> {
    await db.delete(messages);
    Alert.alert("All messages deleted");
  },

  async getMessagesByThreadId(threadId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(messages.localCreatedAt);
  },

  async updateSyncStatus(id: string, status: 'pending' | 'synced' | 'failed', readStatus?: ReadStatus): Promise<void> {
    await db
      .update(messages)
      .set({ syncStatus: status, readStatus: readStatus || ReadStatus.sent })
      .where(eq(messages.id, id));
  },

  async getPendingMessages(): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.syncStatus, 'pending'))
      .orderBy(messages.localCreatedAt);
  },

  async getServerMessages(threadId: string): Promise<ChatMessages[]> {
    return fetchMessages(threadId)
  }
};
