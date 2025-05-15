import { useQuery } from '@tanstack/react-query';
import { supabase } from '~/supabase/client';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {ChatThreads} from "~/types";
import {THREADS_CACHE_KEY} from "~/lib/constants";
import {User} from "@supabase/auth-js";
import { getCachedThread } from '~/services/chat';
import {useLiveQuery} from "drizzle-orm/expo-sqlite";
import {db} from "~/db";
import {messages} from "~/db/schema";
import {and, count, desc, eq, gte, lte} from "drizzle-orm";
import {threadRepository} from "~/db/threads";
import {format} from "date-fns";
import {useIsomorphicLayoutEffect} from "@rn-primitives/hooks";
import { useState } from 'react';

export function useLatestThreadMessage(threadId: string) {
  const {data} = useLiveQuery(
    db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(desc(messages.localCreatedAt))
      .limit(1)
  );

  return data[0] || null;
}

export function usePendingThreadMessages(threadId: string): { count: number } {
  const lastOpened = threadRepository.getThreadIdFromKVStore(threadId);
  if (!lastOpened) return { count: 0 };

  const { lastOpened: lastOpenedTime } = JSON.parse(lastOpened);
  if (!lastOpenedTime) return {count: 0};

  // Get the count of the messages of this thread in the localDB that is greater than the lastOpened time
  const data = useLiveQuery(
    db
      .select({ count: count() })
      .from(messages)
      .where(
        and(
          eq(messages.threadId, threadId),
          eq(messages.syncStatus, 'pending'),
          gte(messages.localCreatedAt, format(lastOpenedTime!, "yyyy-MM-dd HH:mm:ss")),
        )
      )
  ).data

  // db
  //   .$count(
  //     messages,
  //     and(
  //       eq(messages.threadId, threadId),
  //       eq(messages.syncStatus, 'pending'),
  //       gte(messages.localCreatedAt, new Date(lastOpenedTime).toISOString()),
  //     )
  //   )
  // .select({ values: count() })
  // .from(messages)
  // .where(
  //   and(
  //     eq(messages.threadId, threadId),
  //     eq(messages.syncStatus, 'pending'),
  //     gte(messages.localCreatedAt, format(lastOpenedTime, "yyyy-MM-dd HH:mm:ss")),
  //   )
  // )
  // const { data } = useLiveQuery(
  // )

  return data?.[0] || 0;
}

export function useThread(otherUserId: string) {
  const getCachedThread = async (otherUserId: string) => {
    try {
      const cached = await AsyncStorage.getItem(THREADS_CACHE_KEY);
      // if (!cached) return null;
      if (!cached) return getThreadOrCache();

      const threads = JSON.parse(cached);
      // Fetch the desired thread if it doesn't exist. i.e., load over the network
      return threads[otherUserId] || getThreadOrCache();
    } catch (e) {
      console.error('Error getting cached thread:', e);
      return null;
    }
  };

  async function getThreadOrCache () {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { data: existing, error } = await supabase
      .from('chat_threads')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
      .maybeSingle();


    if (error) throw error;
    // if (existing?.id) return existing.id;
    if (existing) {
      await cacheThread(existing.id, existing);
      return existing.id;
    }

    const { data: created, error: createErr } = await supabase
      .from('chat_threads')
      .insert({ user1_id: user.id, user2_id: otherUserId })
      .select('id')
      .single();

    if (createErr) throw createErr;
    return created.id;
  }

  // Cache management functions
  const cacheThread = async (threadId: string, data: ChatThreads) => {
    try {
      const cached = await AsyncStorage.getItem(THREADS_CACHE_KEY);
      const threads = cached ? JSON.parse(cached) : {};
      threads[threadId] = data;
      await AsyncStorage.setItem(THREADS_CACHE_KEY, JSON.stringify(threads));
    } catch (e) {
      console.error('Error caching thread:', e);
    }
  };

  return useQuery({
    queryKey: ['thread', otherUserId],
    // queryFn: () => getThread(otherUserId),
    queryFn: () => getCachedThread(otherUserId),
    // staleTime: Infinity, // Cache the result indefinitely
    staleTime: 10 * 60 * 60, // Cache for 1 minute
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour,
  });
}
