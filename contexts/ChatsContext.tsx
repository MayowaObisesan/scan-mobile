import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePayments } from '~/hooks/usePayments';
import {useCreateMessage, useDeleteMessage, useGetMessages, useUpdateMessage,} from '~/hooks/useChatMessages';
import {ChatMessages, ChatMessagesInsert, ChatThreads, Payments, PaymentsInsert, ProfilesInsert} from '~/types';
import {User} from "@supabase/auth-js";
import {DefinedUseQueryResult, UseMutationResult} from "@tanstack/react-query";
import {Message, NewPayment} from "~/db/schema";

interface ChatsContextProps {
  createPayment: UseMutationResult<Payments, Error, NewPayment>;
  updatePayment: UseMutationResult<Payments, Error, Partial<NewPayment>>;
  deleteMessage: (messageId: string) => Promise<void>;
  getMessages: DefinedUseQueryResult<Promise<ChatMessages[]>, Error>;
  handleCreateMessage: ({recipientId, newMessage}: {
    recipientId: string;
    newMessage: Message;
  }) => Promise<void>;
  updateMessage: UseMutationResult<ChatMessages, Error, ChatMessagesInsert>
}

const ChatsContext = createContext<ChatsContextProps | undefined>(undefined);

export const ChatsProvider: React.FC<{ authUser: User, threadId: string, children: React.ReactNode }> = ({ authUser, threadId, children }) => {
  const getMessages = useGetMessages(threadId);
  const createMessage = useCreateMessage();
  const deleteMessage = useDeleteMessage();
  const updateMessage = useUpdateMessage();
  const { createPayment, updatePayment } = usePayments();
  // const [messagesQuery, setMessagesQuery] = useState<any>([]);

  // Create a payment and send it as a message
  const handleCreateMessage = useCallback(async ({recipientId, newMessage}: {recipientId: string, newMessage: ChatMessagesInsert}) => {
    const messageResponse = await createMessage.mutateAsync({recipientId: recipientId, newMessage: newMessage});
  }, [createMessage]);

  return (
    <ChatsContext.Provider
      value={{
        createPayment,
        updatePayment,
        deleteMessage,
        getMessages,
        handleCreateMessage,
        updateMessage,
      }}
    >
      {children}
    </ChatsContext.Provider>
  );
};

export const useChatsContext = (): ChatsContextProps => {
  const context = useContext(ChatsContext);
  if (!context) {
    throw new Error('useChatsContext must be used within a ChatsProvider');
  }
  return context;
};
