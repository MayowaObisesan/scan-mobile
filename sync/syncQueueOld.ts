// sync/syncQueue.ts
import { Message, NewMessage } from '~/db/schema';
import { messageRepository } from '~/db/messages';
import { supabase } from '~/supabase/client';
import AsyncStorage from 'expo-sqlite/kv-store';
import {encryptMessageUsingSecret} from "~/lib/crypto";
import {ChatMessageType, DBTables, ReadStatus, SyncStatus} from "~/types/enums";
import {ChatMessagesInsert} from "~/types";

const SYNC_QUEUE_KEY = 'sync_queue';
const MAX_RETRIES = 3;

interface QueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  data: Partial<Message>;
  retries: number;
  timestamp: number;
}

class MessageSyncQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;

  constructor() {
    this.loadQueue();
  }

  private async loadQueue() {
    try {
      const savedQueue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (savedQueue) {
        this.queue = JSON.parse(savedQueue);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
    }
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  async enqueue(operation: QueueItem['operation'], data: Partial<Message>) {
    const item: QueueItem = {
      id: data.id!,
      operation,
      data,
      retries: 0,
      timestamp: Date.now(),
    };

    this.queue.push(item);
    await this.saveQueue();
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    try {
      const item = this.queue[0];
      console.log("PROCESSING QUEUE:::", this.queue.length);
      const success = await this.syncItem(item);

      if (success) {
        this.queue.shift();
        await this.saveQueue();

        console.log("QUEUE SAVED SUCCESSFULLY:::")
      } else {
        console.log("QUEUE FAILED TO SAVE:::")
        item.retries++;
        if (item.retries >= MAX_RETRIES) {
          this.queue.shift();
          await messageRepository.updateSyncStatus(item.id, 'failed');
        }
        console.log("QUEUE FAILED TO SAVE RETRYING:::")
        await this.saveQueue();
        console.log("QUEUE FAILED TO SAVE RETRYING SAVED:::")
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
      // TODO: Remove this retry logic, have a more efficient way to handle retries
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 1000); // Retry after 1 second
      }
    }
  }

  private async syncItem(item: QueueItem): Promise<boolean> {
    try {
      switch (item.operation) {
        case 'create':
          const newMessage = item.data;
          const rawMessage = newMessage.content;
          const {cipher, nonce} = encryptMessageUsingSecret(
            rawMessage!,
            newMessage.threadId!
          )
          newMessage.content = cipher
          newMessage.nonce = nonce

          // console.log("SYNCING ITEM FROM QUEUE::: ", newMessage)
          console.log("SYNCING ITEM FROM QUEUE::: ")
          const { error: createError } = await supabase
            .from(DBTables.ChatMessages)
            .insert({
              id: newMessage.id,
              thread_id: newMessage.threadId,
              sender_id: newMessage.senderId,
              content: cipher,
              image_url: newMessage.imageUrl ?? null,
              nonce: newMessage.nonce,
              message_type: ChatMessageType.text,
              sync_status: SyncStatus.synced,
              read_status: ReadStatus.delivered,
              read: newMessage.read,
              local_created_at: newMessage.localCreatedAt,
            } as unknown as ChatMessagesInsert);

          if (createError) {
            console.log("Error occurred when sending messages to server.", createError.message);
          }
          if (!createError) {
            await messageRepository.updateSyncStatus(item.id, 'synced', ReadStatus.delivered);
            return true;
          }
          break;

        case 'update':
          const updatedData = item.data;
          const updatedRawMessage = updatedData.content;
          const {cipher: updateCipher, nonce: updateNonce} = encryptMessageUsingSecret(
            updatedRawMessage!,
            updatedData.threadId!
          )
          updatedData.content = updateCipher
          updatedData.nonce = updateNonce

          const { error: updateError } = await supabase
            .from(DBTables.ChatMessages)
            .update(item.data)
            .eq('id', item.id);
          if (!updateError) {
            await messageRepository.updateSyncStatus(item.id, 'synced');
            return true;
          }
          break;

        case 'delete':
          const { error: deleteError } = await supabase
            .from(DBTables.ChatMessages)
            .delete()
            .eq('id', item.id);
          if (!deleteError) {
            return true;
          }
          break;
      }
    } catch (error) {
      console.error('Error syncing item:', error);
    }
    return false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

export const syncQueue = new MessageSyncQueue();
