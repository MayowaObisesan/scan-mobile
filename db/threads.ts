import {type Message, messages, NewThread, Thread, threads} from "~/db/schema";
import {db} from "~/db/index";
import {and, desc, eq, or} from "drizzle-orm";
import {DBTables, SyncStatus} from "~/types/enums";
import {ChatMessages, ChatThreads} from "~/types";
import {supabase} from "~/supabase/client";
import AsyncStorage from "expo-sqlite/kv-store";
import {User} from "@supabase/auth-js";
import {THREADS_CACHE_KEY} from "~/lib/constants";
import {profileRepository} from "~/db/profiles";

export const threadRepository = {
  async getLocalChatThreads(user: User) {
    const chatThreadsData = await db.query.threads.findMany({
      where: or(
        eq(threads.user1Id, user?.id!),
        eq(threads.user2Id, user?.id!)
      )
    });

    return chatThreadsData;
  },

  async getMyThreadsFromCacheOrServer(user: User): Promise<ChatThreads[]> {
    // check cache for a threadsKey, if it exists
    // Fetch from the cache, else fetch from the server
    const cachedThreads = await AsyncStorage.getItem(THREADS_CACHE_KEY)
    if (cachedThreads) {
      // parse and return the cachedThreads here
      return JSON.parse(cachedThreads) || [];
    }

    const {data: chatThreadsData, error: chatThreadsError} = await supabase
      .from(DBTables.ChatThreads)
      .select('*')
      .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`);

    if (chatThreadsError) {
      console.log("GET MY THREADS FROM CACHE OR SERVER - ERROR", chatThreadsError);
      return [];
    }

    // Store chatThreads Data from the server to the cache
    await AsyncStorage.setItem(THREADS_CACHE_KEY, JSON.stringify(chatThreadsData));

    return chatThreadsData;
  },

  getThreadIdFromKVStore(threadId: string) {
    return AsyncStorage.getItemSync(`threadId:${threadId}`)
  },

  async saveThreadIdToKVStore(threadId: string): Promise<boolean> {
    try {
      AsyncStorage.setItem(`threadId:${threadId}`, JSON.stringify({lastOpened: Date.now()}))
      return true;
    } catch (e) {
      console.error(e as any);
      return false;
    }
  },

  async create(newThreads: NewThread[]) : Promise<Thread[]> {
    return db.insert(threads).values(newThreads).returning();
  },

  async getAllThreads(): Promise<Thread[]> {
    const data = await db.select().from(threads);

    return data || [];
  },

  async getThreadById(id: string): Promise<Thread | null> {
    const data = await db
      .select()
      .from(threads)
      .where(eq(threads.id, id))
      .limit(1);
    return data?.[0] || null
  },

  async getThreadByPhoneNumber(user:User, recipientPhoneNumber: string): Promise<Thread | null> {
    // First get the userId from profileTable, then get the threadId from the userId
    const phoneNumberProfile = await profileRepository.getProfileByPhoneNumber(recipientPhoneNumber);
    const data = await db
      .select()
      .from(threads)
      .where(
        or(
          and(
            eq(threads.user1Id, user.id),
            eq(threads.user2Id, phoneNumberProfile?.id),
          ),
          and(
            eq(threads.user1Id, phoneNumberProfile?.id),
            eq(threads.user2Id, user.id),
          )
        )
      )
      .limit(1);

    return data?.[0] || null
  },

  async deleteThread(id: string): Promise<number> {
    const data = await db.delete(threads).where(eq(threads.id, id)).returning();
    return data.length;
  },

  async getPendingThreadMessages(threadId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(and(eq(messages.threadId, threadId), eq(messages.syncStatus, SyncStatus.pending)))
      .orderBy(messages.localCreatedAt);
  },

  async getServerMessagesByThread(threadId: string, latestId: string | null): Promise<ChatMessages[]> {
    if (!latestId) {
      const { data, error } = await supabase
        .from(DBTables.ChatMessages)
        .select("*, payments(*)")
        .eq('thread_id', threadId)
        .order('local_created_at', { ascending: true });

      if (!error) throw error;

      return data || [];
    }

    const { data: messagesOnServer, error: messagesOnServerError } = await supabase
      .from(DBTables.ChatMessages)
      .select("*")
      .match({thread_id: threadId, id: latestId})
      .maybeSingle();

    if (messagesOnServerError) throw messagesOnServerError;

    const {data, error } = await supabase
      .from(DBTables.ChatMessages)
      .select("*, payments(*)")
      .gt('local_created_at', messagesOnServer.local_created_at)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data;
  },

  async getUserServerMessages(userId: string): Promise<ChatMessages[]> {
    // Get all the threads you are a part of and load them
    const { data: threadsData, error: threadsError } = await supabase
      .from('chat_threads')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    console.log("threadsData", threadsData?.flatMap((threads) => Object.values(threads)));

    if (threadsError) throw threadsError;

    const {data, error} = await supabase
      .from(DBTables.ChatMessages)
      .select("*, payments(*)")
      .in('thread_id', threadsData?.flatMap((threads) => Object.values(threads)));

    if (error) throw error;

    return data;
  },

  async getLatestLocalThreadMessage(threadId: string): Promise<Message | null> {
    const data = await db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(desc(messages.localCreatedAt))
      .limit(1);

    return data?.[0] || null;
  }
}
