import { Message } from '~/db/schema';
import { messageRepository } from '~/db/messages';
import { supabase } from '~/supabase/client';
import AsyncStorage from 'expo-sqlite/kv-store';
import { encryptMessageUsingSecret } from "~/lib/crypto";
import { ChatMessageType, DBTables, ReadStatus, SyncStatus } from "~/types/enums";
import { ChatMessagesInsert } from "~/types";
import {convertLocalMessageToSyncMessage} from "~/utils";

const SYNC_QUEUE_KEY = 'sync_queue';
const MAX_RETRIES = 3;
const BATCH_SIZE = 10;
const RETRY_DELAYS = [1000, 2000, 5000]; // Progressive delays

interface QueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  data: Partial<Message>;
  retries: number;
  timestamp: number;
  priority: number;
}

class MessageSyncQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private processingTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    await this.loadQueue();
    this.startProcessing();
  }

  private async loadQueue() {
    try {
      const savedQueue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (savedQueue) {
        this.queue = JSON.parse(savedQueue);
        this.sortQueue();
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
    }
  }

  private sortQueue() {
    this.queue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  async enqueue(operation: QueueItem['operation'], data: Partial<Message>, priority = 1) {
    const item: QueueItem = {
      id: data.id!,
      operation,
      data,
      retries: 0,
      timestamp: Date.now(),
      priority
    };

    this.queue.push(item);
    this.sortQueue();
    await this.saveQueue();
    this.startProcessing();
  }

  private startProcessing() {
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
    }
    this.processingTimeout = setTimeout(() => this.processBatch(), 100);
  }

  private async processBatch() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const batch = this.queue.slice(0, BATCH_SIZE);

    try {
      const results = await Promise.allSettled(
        batch.map(item => this.syncItem(item))
      );

      let hasChanges = false;
      results.forEach((result, index) => {
        const item = batch[index];
        if (result.status === 'fulfilled' && result.value) {
          this.queue = this.queue.filter(q => q.id !== item.id);
          hasChanges = true;
        } else {
          const queueItem = this.queue.find(q => q.id === item.id);
          if (queueItem) {
            queueItem.retries++;
            if (queueItem.retries >= MAX_RETRIES) {
              this.queue = this.queue.filter(q => q.id !== item.id);
              messageRepository.updateSyncStatus(item.id, 'failed')
                .catch(console.error);
              hasChanges = true;
            }
          }
        }
      });

      if (hasChanges) {
        await this.saveQueue();
      }
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        this.processingTimeout = setTimeout(
          () => this.processBatch(),
          RETRY_DELAYS[Math.min(this.queue[0].retries, RETRY_DELAYS.length - 1)]
        );
      }
    }
  }

  private async syncItem(item: QueueItem): Promise<boolean> {
    const { operation, data, id } = item;

    try {
      // const { cipher, nonce } = encryptMessageUsingSecret(
      //   data.content!,
      //   data.threadId!
      // );

      switch (operation) {
        case 'create': {
          const { error } = await supabase
            .from(DBTables.ChatMessages)
            .insert({
              id: data.id,
              thread_id: data.threadId,
              sender_id: data.senderId,
              content: data.content,  // Not encrypted because encrypted data is what is stored locally.
              image_url: data.imageUrl ?? null,
              nonce: data.nonce,
              message_type: ChatMessageType.text,
              sync_status: SyncStatus.synced,
              read_status: ReadStatus.delivered,
              read: data.read,
              local_created_at: data.localCreatedAt,
            } as ChatMessagesInsert);

          if (!error) {
            await messageRepository.updateSyncStatus(id, 'synced', ReadStatus.delivered);
            return true;
          }
          break;
        }

        case 'update': {
          const { error } = await supabase
            .from(DBTables.ChatMessages)
            .update(data)
            .eq('id', id);

          if (!error) {
            await messageRepository.updateSyncStatus(id, 'synced');
            return true;
          }
          break;
        }

        case 'delete': {
          const { error } = await supabase
            .from(DBTables.ChatMessages)
            .update(convertLocalMessageToSyncMessage([data])[0])
            .eq('id', id);

          return !error;
        }
      }
    } catch (error) {
      console.error(`Sync error for item ${id}:`, error);
    }
    return false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

export const syncQueue = new MessageSyncQueue();
