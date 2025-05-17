import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {supabase} from '~/supabase/client';
import {ChatMessages, ChatMessagesInsert} from '~/types';
import {DBTables} from "~/types/enums";
import {decryptMessageUsingSecret, encryptMessageUsingSecret} from "~/lib/crypto";
import {getCachedMessages} from '~/services/chat';
import {syncEngine} from "~/sync/syncEngine";
import {db} from '~/db';
import {Message, messages, payments} from '~/db/schema';
import {asc, desc, eq} from 'drizzle-orm';
import {useLiveQuery} from "drizzle-orm/expo-sqlite";
import {useDrizzleStudio} from "expo-drizzle-studio-plugin";
import {messageRepository} from "~/db/messages";
import {threadRepository} from "~/db/threads";
import {Alert} from "react-native";
import {toast} from "sonner-native";

// How can I optimize the performance of real-time updates of chat messages

export const useRealTimeChatInsert = (userId: string, channelName: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase
      .channel(`e2e_${channelName}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: DBTables.ChatMessages,
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async (payload) => {
          // Update the local DB
          // syncEngine.createMessage(payload.new)
          // console.log("CHAT INSERT SUBSCRIPTION RECEIVED FROM", payload.new);

          // Sync with the server

          if (payload.new) {
            // await syncEngine.syncFromServerMessages(channelName);
            // Alert.alert("New message received", "CHAT SUBSCRIPTION RECEIVED");
            console.log("New message received", "CHAT SUBSCRIPTION RECEIVED");

            /*if (db) {
              const latestMessage = db
                  .select()
                  .from(messages)
                  .where(eq(messages.threadId, payload.new.threadId))
                  .orderBy(desc(messages.localCreatedAt))
                  .limit(1);

              // console.log("Latest message on", latestMessage);
              // await threadRepository.getServerMessages(payload.new.threadId, latestMessage)

              // Instructions on how to insert when insert subscription is received.
              // Perform an insert to the local DB using the threadId as params.
              // await messageRepository.createMessage(payload.new)
            }*/
          }
          // toast.info("New message received", {description: "CHAT SUBSCRIPTION RECEIVED"});
          queryClient.invalidateQueries({queryKey: ["chat_messages", channelName]});
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: DBTables.ChatMessages,
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async (payload) => {
          /*
          No longer using the cacheMessage implementation - now using the SQLite & Drizzle implementation.
          if (userId !== payload.new.sender_id) {
            // Update cache for chats of this channel (or thread_id) other users and trigger re-render.
            // Don't update the cache for the sender of this chat that is being updated, because the cache
            // of the user that sent this chat update has already been updated once the chat updated successfully.
            const threadId = payload.new.thread_id;
            const messages = await getCachedMessages(threadId);
            await cacheMessages(threadId, [payload.new, ...messages]);
          }*/

          // Update the local DB
          // syncEngine.updateMessage(payload.new)
          await queryClient.invalidateQueries({queryKey: ["chat_messages", channelName]});
        },
      )
      .subscribe();

    console.log("Real time chat insert subscription", channelName);

    return () => {
      supabase.channel(channelName).unsubscribe();
    };
  }, [queryClient, channelName]);
};

interface UseChatMessagesOptions {
  threadId: string;
  enableDecryption?: boolean;
  isWrite?: boolean;
}

export function useChatMessages({threadId, enableDecryption = true, isWrite = false}: UseChatMessagesOptions) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Add a cache layer before the liveQuery
  const {data: cachedMessages} = useGetMessagesUsingAsyncStore(threadId);
  console.log("cachedMessages", cachedMessages.length);

  // Use Drizzle's live query to get real-time updates
  const {data: localChatMessages} = useLiveQuery(
    db
      .select({
        id: messages.id,
        threadId: messages.threadId,
        content: messages.content,
        senderId: messages.senderId,
        imageUrl: messages.imageUrl,
        sig: messages.sig,
        nonce: messages.nonce,
        updatedAt: messages.updatedAt,
        createdAt: messages.createdAt,
        messageType: messages.messageType,
        readStatus: messages.readStatus,
        syncStatus: messages.syncStatus,
        deleted: messages.deleted,
        localCreatedAt: messages.localCreatedAt,
        payments: payments
      })
      .from(messages)
      .leftJoin(payments, eq(payments.id, messages.payments))
      .where(eq(messages.threadId, threadId))
      .orderBy(desc(messages.localCreatedAt))
  , [threadId]);

  let localDBChatMessages;

  if (!isWrite) {
    localDBChatMessages = cachedMessages;
  } else {
    localDBChatMessages = localChatMessages;
  }

  // console.log("localChatMessages", localChatMessages);
  console.log("localChatMessages", localChatMessages.length);

  // Process and decrypt messages if needed
  const processedMessages = localChatMessages?.map(message => {
    if (enableDecryption && message.content && message.nonce) {
      try {
        const decrypted = decryptMessageUsingSecret(
          message.content,
          message.nonce,
          threadId
        );
        // NqdAPyx00TBjS6O/PCgr7Xyyww== 3u7aGCQCW7I5o0Gs3a9YQsW9myOX+FTb 9009eca4-81ca-419d-ae46-f7983e576738 Hey
        // console.log("Trying to decrypt message", message.content, message.nonce, threadId, decrypted)
        return {...message, decryptedContent: decrypted, encrypted: true};
      } catch (e) {
        console.error('Error decrypting message:', e);
        return message;
      }
    }
    console.log("Message decryption complete");
    console.log("message", message);
    return message;
  });

  // Initial load and sync
  /*useEffect(() => {
    const loadAndSync = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Trigger sync of pending messages
        await syncEngine.syncPendingMessages();

        // await refetch();
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to load messages'));
        console.error('Error loading messages:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadAndSync();
  }, [threadId]);*/

  return {
    messages: processedMessages || [],
    isLoading,
    error,
  };
}

export function useGetMessages(threadId: string) {
  return useQuery({
    queryKey: ["chat_messages", threadId],
    queryFn: () => messageRepository.getMessagesByThreadId(threadId),
    // Enable real-time updates
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60 * 15, // Poll every 15 minutes
  })
}

// Fetch messages for a specific thread
export const useGetMessagesUsingAsyncStore = (threadId: string) => {

  return useQuery({
    queryKey: ['chat_messages', threadId],
    // queryFn: () => fetchMessages(threadId),
    queryFn: async () => await getCachedMessages(threadId),
    gcTime: 1000 * 60 * 60 * 24, // Keep data in cache for 1 day
    staleTime: 1000 * 60 * 1, // Consider data fresh for 15 minutes
    initialData: () => {
      return getCachedMessages(threadId);
    },
    placeholderData: () => {
      return getCachedMessages(threadId);
    },
    /*onSuccess: (data: ChatMessages[]) => {
      getCachedMessages(threadId)
      // Cache the messages
      cacheMessages(threadId, data);
    },
    onError: (error: PostgrestError) => {
      console.error("Error fetching messages", error.message)
      throw new Error("Error fetching messages")
    },*/
    refetchOnWindowFocus: false,  // Keep false because we are using on mobile
    refetchInterval: 1000 * 60 * 15, // 15 minutes
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (newMessage: Partial<Message>) => {
      const rawMessage = newMessage.content;
      const {cipher, nonce} = encryptMessageUsingSecret(
        rawMessage!,
        newMessage.threadId!
      )
      newMessage.content = cipher
      newMessage.nonce = nonce

      return syncEngine.createLocalMessageAndSyncWithServer(newMessage)
    },
    onMutate: async (newMessage) => {
      // Cancel outgoing fetches
      await queryClient.cancelQueries({
        queryKey: ['chat_messages', newMessage.threadId]
      })

      // Get current messages
      const previousMessages = queryClient.getQueryData(['chat_messages', newMessage.threadId])

      // Optimistically update messages
      queryClient.setQueryData(['chat_messages', newMessage.threadId], (old: ChatMessages[] = []) => {
        return [...old, newMessage]
      })

      return {previousMessages}
    },
    onError: (err, newMessage, context) => {
      // On error, roll back
      queryClient.setQueryData(
        ['chat_messages', newMessage.threadId],
        context?.previousMessages
      )
    },
    onSettled: (_, __, newMessage) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: ['chat_messages', newMessage.threadId]
      })
    }
  })
}

// Create new message
export function useCreateMessageUsingAsyncStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({newMessage, recipientId}: { newMessage: ChatMessagesInsert, recipientId: string }) => {
      // handle message encryption and update the message content
      const rawMessage = newMessage.content;
      const {cipher, nonce} = encryptMessageUsingSecret(
        rawMessage,
        newMessage.thread_id
      )
      newMessage.content = cipher
      newMessage.nonce = nonce

      const {data, error} = await supabase
        .from('chat_messages')
        .insert(newMessage)
        .select()
        .single();

      if (error) throw error;

      /*// 🔔 Trigger push notification via Edge Function
      await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/notify-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to_user_id: recipientId,
          title: `New scan message`,
          body: rawMessage.slice(0, 100)
        })
      });*/

      return data;
    },
    onMutate: async (newMessage) => {
      // Cancel outgoing fetches
      await queryClient.cancelQueries({
        queryKey: ['chat_messages', newMessage.newMessage.thread_id]
      })

      // Get current messages
      const previousMessages = queryClient.getQueryData(['chat_messages', newMessage.newMessage.thread_id])

      // Optimistically update messages
      queryClient.setQueryData(['chat_messages', newMessage.newMessage.thread_id], (old: ChatMessages[] = []) => {
        return [...old, newMessage]
      })

      return {previousMessages}
    },
    /*onSuccess: async (data: ChatMessages, variables) => {
      const threadId = variables.newMessage.thread_id;

      // Store the currently stored data in cache so that pending states
      // like chat sent received status and payment transaction states can be resolved.
      const messages = await getCachedMessages(threadId);
      await cacheMessages(threadId, [decryptChatMessage(threadId, data), ...messages]);

      // Invalidate the `chat_messages` query for this threadId
      await queryClient.invalidateQueries({queryKey: ['chat_messages', threadId]});
    },*/

  });
}

// Update message
export function useUpdateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({id, updates}: { id: string; updates: Partial<ChatMessages> }) => {
      const rawMessage = updates.content;
      const {cipher, nonce} = encryptMessageUsingSecret(
        rawMessage!,
        updates.thread_id!
      )
      updates.content = cipher
      updates.nonce = nonce

      const {data, error} = await supabase
        .from('chat_messages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newMessage) => {
      // Cancel outgoing fetches
      await queryClient.cancelQueries({
        queryKey: ['chat_messages', newMessage.updates.thread_id]
      })

      // Get current messages
      const previousMessages = queryClient.getQueryData(['chat_messages', newMessage.updates.thread_id])

      // Optimistically update messages
      queryClient.setQueryData(['chat_messages', newMessage.updates.thread_id], (old: ChatMessages[] = []) => {
        return old.map((message) => {
          if (message.id === newMessage.id) {
            return {...message, ...newMessage.updates}
          }
          return message
        })
      })

      return {previousMessages}
    },
    /*onSuccess: async (data: ChatMessages, variables) => {
      const threadId = variables.updates.thread_id!;

      // Store the currently stored data in cache so that pending states
      // like chat sent received status and payment transaction states can be resolved.
      const messages = await getCachedMessages(threadId);
      await cacheMessages(threadId, [decryptChatMessage(threadId, data), ...messages]);

      await queryClient.invalidateQueries({ queryKey: ['chat_messages'] });
    },*/
    onError: (err, newMessage, context) => {
      // On error, roll back
      queryClient.setQueryData(
        ['chat_messages', newMessage.updates.thread_id],
        context?.previousMessages
      )
    },
    onSettled: (_, __, newMessage) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: ['chat_messages', newMessage.updates.thread_id]
      })
    }
  });
}

// Delete message
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const {error} = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    /*onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat_messages'] });
    },*/
    onMutate: async (id) => {
      // Cancel outgoing fetches
      await queryClient.cancelQueries({
        queryKey: ['chat_messages']
      })

      // Get current messages
      const previousMessages = queryClient.getQueryData(['chat_messages'])

      // Optimistically update messages
      queryClient.setQueryData(['chat_messages'], (old: ChatMessages[] = []) => {
        return old.filter((message) => message.id !== id)
      })

      return {previousMessages}
    },
    onError: (err, id, context) => {
      // On error, roll back
      queryClient.setQueryData(
        ['chat_messages'],
        context?.previousMessages
      )
    },
    onSettled: (_, __, id) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: ['chat_messages']
      })
    }
  })
}
