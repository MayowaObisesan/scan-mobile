// sync/syncEngine.ts
import {messageRepository} from '~/db/messages';
import {threadRepository} from '~/db/threads';
import { syncQueue } from './syncQueue';
import NetInfo from '@react-native-community/netinfo';
import {Message, NewMessage} from '~/db/schema';
import { debounce } from 'lodash';
import {ReadStatus, SyncStatus} from "~/types/enums";
import {convertChatMessageToLocalMessage} from "~/utils";
import {AppState} from "react-native";

type QueueType  = 'create' | 'update' | 'delete';
type MessageWithCacheTimestamp = Message & { cacheTimestamp: number };

interface QueueItem {
  type: QueueType;
  data: Message;
  priority: number;
  timestamp: number;
}

export class SyncEngine {
  private static instance: SyncEngine;
  private isOnline: boolean = true;
  private syncInterval: NodeJS.Timeout | null = null;
  private batchSize = 50; // Configurable
  private queue: QueueItem[] = [];
  private messageCache = new Map<string, MessageWithCacheTimestamp>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  private maxRetries = 3;
  private baseDelay = 1000;
  private appStateListener: any;

  private constructor() {
    // this.setupNetworkListener();
    // this.startPeriodicSync();
    this.appStateListener = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        this.setupNetworkListener() // setupNetworkListener already calls syncPendingMessage
        console.log("SYNC ENGING::: PAGE IS ACTIVE:: SYNCING PENDING MESSAGES TO SERVER")
      } else if (nextState === 'background') {
        this.cleanup()
        this.syncInterval = null;
      }
    });
    console.log("SyncEngine initialized");
  }

  static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  private debouncedSync = debounce(() => {
    if (this.isOnline) {
      this.syncPendingMessages();
    }
  }, 30000);

  private cacheMessage(message: Message) {
    this.messageCache.set(message.id, {
      ...message,
      cacheTimestamp: Date.now()
    });
  }

  private clearExpiredCache() {
    const now = Date.now();
    this.messageCache.forEach((value, key) => {
      if (now - value.cacheTimestamp > this.cacheTTL) {
        this.messageCache.delete(key);
      }
    });
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = !!state.isConnected;

      if (wasOffline && this.isOnline) {
        // this.syncPendingMessages();
        this.debouncedSync();
      }
    });
  }

  private startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingMessages();
      }
    }, 30000); // Sync every 30 seconds
  }

  async addToQueue(type: QueueType, message: Message, priority: number = 1) {
    this.queue.push({
      type,
      data: message,
      priority,
      timestamp: Date.now()
    });

    this.queue.sort((a, b) => b.priority - a.priority);
    this.processQueue();
  }

  private async processQueue() {
    while (this.queue.length > 0 && this.isOnline) {
      const item = this.queue.shift();
      await syncQueue.enqueue(item?.type!, item?.data!);
    }
  }

  private async retryWithBackoff(operation: () => Promise<void>, retries = 0): Promise<void> {
    console.log("RETRYING WITH BACKOFF:::")
    try {
      await operation();
      console.log("RETRYING WITH BACKOFF - AFTER OPERATION:::")
    } catch (error) {
      if (retries < this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(operation, retries + 1);
      }
      throw error;
    }
  }

  async syncPendingMessages() {
    try {
      const pendingMessages = await messageRepository.getPendingMessages();
      console.log("Syncing pending messages:", pendingMessages);
      for (const message of pendingMessages) {
        await syncQueue.enqueue('create', message);
      }
    } catch (error) {
      console.error('Error syncing pending messages:', error);
    }
  }

  async syncFromServerMessages(threadId: string) {
    try {
      const serverMessages = await messageRepository.getServerMessages(threadId);
      await messageRepository.replaceAll(convertChatMessageToLocalMessage(serverMessages));
      // alert("Fetching server messages");
    } catch(error) {
      console.error("Error syncing server messages to Local", error);
    }
  }

  async syncAllUserMessagesFromServer(userId: string) {
    try {
      // const serverMessages = await threadRepository.getServerMessages(threadId, null);
      const serverMessages = await threadRepository.getUserServerMessages(userId);
      await messageRepository.replaceAll(convertChatMessageToLocalMessage(serverMessages));
      console.log("Syncing user server messages to Local", serverMessages);
      // alert("Fetching server messages");
    } catch(error) {
      console.error("Error syncing server messages to Local", error);
    }
  }

  async syncPendingMessagesInBatches() {
    try {
      const pendingMessages = await messageRepository.getPendingMessages();
      // Process in batches
      for (let i = 0; i < pendingMessages.length; i += this.batchSize) {
        const batch = pendingMessages.slice(i, i + this.batchSize);
        await Promise.all(batch.map(message =>
          syncQueue.enqueue('create', message)
        ));
      }
    } catch (error) {
      console.error('Error syncing pending messages:', error);
    }
  }

  async createLocalMessageAndSyncWithServer(message: Message) {
    console.log("SYNC ENGING - CREATE MESSAGE", message)
    await this.retryWithBackoff(async () => {
      const result = await messageRepository.create([{
        ...message,
        readStatus: ReadStatus.sent,
        syncStatus: SyncStatus.pending,
      }]);
      if (this.isOnline) {
        await syncQueue.enqueue('create', result[0]);
      }
    });
  }

  // Add methods for other operations (update, delete) as needed
  async updateLocalMessageAndSyncWithServer(message: Message) {
    try {
      await messageRepository.update(message);
      await messageRepository.updateSyncStatus(message.id, 'pending');

      if (this.isOnline) {
        await syncQueue.enqueue('update', message);
      }
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  async deleteLocalMessageAndSyncWithServer(messageId: string) {
    try {
      const deleteResult = await messageRepository.deleteById(messageId);
      await messageRepository.updateSyncStatus(messageId, 'pending');

      if (this.isOnline) {
        // await syncQueue.enqueue('delete', { id: messageId });
        await syncQueue.enqueue('delete', deleteResult[0]);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
  }
}

export const syncEngine = SyncEngine.getInstance();
