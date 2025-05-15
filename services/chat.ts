import { Keypair, PublicKey } from '@solana/web3.js'
import {getActiveWallet } from '~/solana/wallet'
import { supabase } from '~/supabase/client'
import { sha256 } from '@noble/hashes/sha256'
import bs58 from 'bs58';
import nacl from "tweetnacl";
import {decryptMessageUsingSecret, encryptMessageUsingSecret } from '~/lib/crypto';
import {ChatMessages, ChatThreads} from "~/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {MESSAGES_CACHE_KEY, THREADS_CACHE_KEY} from "~/lib/constants";
import {useCallback} from "react";
import {User} from "@supabase/auth-js";
import {DBTables} from "~/types/enums";

type Message = {
  from: string
  to: string
  text: string
  timestamp: number
  sig?: string
  imageUri?: string
}

const FAKE_MESSAGES: Record<string, Message[]> = {}

// Cache management functions
export const cacheThread = async (threadId: string, data: ChatThreads) => {
  try {
    const cached = await AsyncStorage.getItem(THREADS_CACHE_KEY);
    const threads = cached ? JSON.parse(cached) : {};
    threads[threadId] = data;
    await AsyncStorage.setItem(THREADS_CACHE_KEY, JSON.stringify(threads));
  } catch (e) {
    console.error('Error caching thread:', e);
  }
};

export const getCachedThread = async (otherUserId: string) => {
  try {
    const cached = await AsyncStorage.getItem(THREADS_CACHE_KEY);
    // if (!cached) return null;
    if (!cached) return getThread(otherUserId);

    const threads = JSON.parse(cached);
    return threads[otherUserId] || null;
  } catch (e) {
    console.error('Error getting cached thread:', e);
    return null;
  }
};

// Thread management
async function getThreadAndCache(sender: User, otherUserId: string){
  try {
    if (!sender) throw new Error('Not authenticated');

    const { data: existing, error } = await supabase
      .from('chat_threads')
      .select('*')
      .or(`and(user1_id.eq.${sender.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${sender.id})`)
      .maybeSingle();

    if (error) throw error;

    if (existing) {
      await cacheThread(existing.id, existing);
      return existing.id;
    }

    const { data: created, error: createErr } = await supabase
      .from('chat_threads')
      .insert({ user1_id: sender.id, user2_id: otherUserId })
      .select()
      .single();

    if (createErr) throw createErr;

    await cacheThread(created.id, created);
    return created.id;
  } catch (e) {
    throw e instanceof Error ? e : new Error('Failed to get thread');
  }
}

export async function getThread(otherUserId: string): Promise<string> {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: existing, error } = await supabase
    .from('chat_threads')
    .select('id')
    .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
    .maybeSingle()

  console.log("getting thread", existing, error)
  if (error) throw error
  if (existing?.id) return existing.id
  console.log("creating thread", user.id, otherUserId)

  const { data: created, error: createErr } = await supabase
    .from('chat_threads')
    .insert({ user1_id: user.id, user2_id: otherUserId })
    .select('id')
    .single()

  console.log("created thread", created)

  if (createErr) throw createErr
  return created.id
}

export async function sendMessageUsingWallet(toId: string, text: string, imageUri?: string): Promise<Message> {
  // const wallets = await getWallets()
  // const sender = wallets[0]
  const sender = await getActiveWallet()

  const sig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  const sigHex = Buffer.from(sig).toString('hex')

  const msg: Message = {
    from: sender?.publicKey.toBase58()!,
    to: toId,
    text,
    timestamp: Date.now(),
    sig: sigHex,
    imageUri
  }

  const key = [sender?.publicKey.toBase58(), toId].sort().join('-')
  FAKE_MESSAGES[key] = [...(FAKE_MESSAGES[key] || []), msg]

  return msg
}

export async function getMessagesWithWallet(userId: string): Promise<Message[]> {
  // const wallets = await getWallets()
  // const myKey = wallets[0].publicKey.toBase58()
  const activeWallet = await getActiveWallet()
  const myKey = activeWallet?.publicKey.toBase58()
  const key = [myKey, userId].sort().join('-')
  return FAKE_MESSAGES[key] || []
}

export async function signSendMessage(toUserId: string, text: string, image_url?: string) {
  const threadId = await getThread(toUserId)
  const wallet = await getActiveWallet()

  if (!wallet) throw new Error('No active wallet')

  // 🔐 Create SHA-256 hash of the message
  const msgBuffer = new TextEncoder().encode(text)
  const hash = sha256(msgBuffer)

  // 🔏 Sign the hash using the wallet
  const sigUint8 = await wallet.signMessage?.(msgBuffer) ?? wallet.sign(msgBuffer)
  // const sigUint8 = wallet.sign(msgBuffer)
  const sig = bs58.encode(sigUint8)

  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No Supabase user session')

  // 📤 Store message in Supabase
  const { error: msgErr } = await supabase.from('chat_messages').insert({
    thread_id: threadId,
    sender_id: user.id,
    content: text,
    image_url: image_url ?? null,
    sender_wallet: wallet.publicKey.toBase58(),
    sig
  })

  if (msgErr) throw msgErr

  // 🔔 Trigger push notification via Edge Function
  await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/notify-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      to_user_id: toUserId,
      title: `New message`,
      body: text.slice(0, 100)
    })
  })
}

export async function getSignedMessagesWith(otherUserId: string) {
  const threadId = await getThread(otherUserId)
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return data.map((msg: any) => {
    let verified = false

    try {
      const senderPk = new PublicKey(msg.sender_wallet)
      const sig = bs58.decode(msg.sig)
      const contentBytes = new TextEncoder().encode(msg.content)

      verified = nacl.sign.detached.verify(contentBytes, sig, senderPk.toBytes())
    } catch (e) {
      console.warn('❌ Signature verification failed for message:', msg.id)
    }

    return {
      ...msg,
      verified
    }
  })
}

export async function sendMessageUsingShared(toUserId: string, text: string, image_url?: string) {
  // Send Encrypted message, only you can see the content of the chat.
  const threadId = await getThread(toUserId)
  // console.log("sending message - get thread", threadId)
  const wallet = await getActiveWallet()
  // console.log("sending message - get active wallet", wallet)

  if (!wallet) throw new Error('No active wallet')

  // 🔐 Create SHA-256 hash of the message
  const msgBuffer = new TextEncoder().encode(text)
  const hash = sha256(msgBuffer)

  console.log("sending message - get hash", hash, msgBuffer);

  // // 🔏 Sign the hash using the wallet
  // const sigUint8 = await wallet.signMessage?.(msgBuffer) ?? wallet.sign(msgBuffer)
  // // const sigUint8 = wallet.sign(msgBuffer)
  // const sig = bs58.encode(sigUint8)

  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No Supabase user session')

  // Fetch recipient wallet (assumed stored in their profile)
  const { data: receiverProfile } = await supabase
    .from('profiles')
    .select('wallet')
    .eq('id', toUserId)
    .single()

  if (!receiverProfile?.wallet) throw new Error('Recipient wallet not set')
  const receiverPk = new PublicKey(receiverProfile.wallet)

  console.log("Sending message - Receiver PK", receiverPk, receiverPk.toJSON());

  const { cipher, nonce, signature } = encryptMessage(
    text,
    wallet.secretKey,
    // .slice(0, 32), // NaCl expects 32-byte secret
    receiverPk.toBytes()
  )

  console.log("Sending message - gotten sig", signature);

  console.log("Sending message - gotten cipher", cipher);

  // 📤 Store message in Supabase
  const { error: msgErr } = await supabase.from('chat_messages').insert({
    thread_id: threadId,
    sender_id: user.id,
    content: cipher,
    image_url: image_url ?? null,
    sender_wallet: wallet.publicKey.toBase58(),
    sig: signature.toString(),
    nonce: nonce
  })

  if (msgErr) throw msgErr

  // 🔔 Trigger push notification via Edge Function
  await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/notify-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      to_user_id: toUserId,
      title: `New message`,
      body: text.slice(0, 100)
    })
  })
}

export async function getMessagesWith(otherUserId: string) {
  const threadId = await getThread(otherUserId)
  const wallet = await getActiveWallet()

  // console.log("getting messages - get thread", threadId)
  // console.log("getting messages - get wallet", wallet)

  const { data: userSession } = await supabase.auth.getUser()
  if (!userSession || !wallet) throw new Error('Missing session or wallet')

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) throw error

  // console.log("getting messages - gotten data", data)

  return data.map((msg: any) => {
    let verified = false
    let decrypted: string | null = null

    /*try {
      const senderPk = new PublicKey(msg.sender_wallet)
      // console.log("getting messages - gotten wallet", msg.sender_wallet)
      console.log("getting messages - gotten msg.sig", msg.sig)
      // console.log("getting messages - gotten msg.sig uint8 array", Uint8Array.from(msg.sig.split(",")))
      // const sig = bs58.decode(Uint8Array.from(msg.sig.split(",")))
      const sig = bs58.decode(msg.sig)
      console.log("getting messages - gotten sig", sig)
      const raw = new TextEncoder().encode(msg.content)
      // console.log("getting messages - gotten raw", raw)

      verified = nacl.sign.detached.verify(raw, sig, senderPk.toBytes())
    } catch(e) {
      console.error("getting messages - verify error", e)
    }*/

    // console.log("getting messages - gotten verified", verified)

    // console.log("getting messages - gotten msg.nonce", msg.nonce)
    // 🔐 Decrypt if encrypted
    if (msg.nonce && msg.sender_wallet && msg.content) {
      console.log("getting messages - decrypting message", msg.nonce, msg.sender_wallet, msg.content)
      try {
        decrypted = decryptMessage(
          msg.content,
          msg.nonce,
          msg.sig,
          wallet.secretKey.slice(0, 32),
          // wallet.publicKey.toBytes()
          new PublicKey(msg.sender_wallet).toBytes()
        )
      } catch (e) {
        decrypted = '[🔒 Decryption failed]'
        console.log(decrypted)
      }
    }

    return {
      ...msg,
      verified,
      text: decrypted || msg.content,
      encrypted: Boolean(msg.nonce)
    }
  })
}

export async function sendMessage(toUserId: string, text: string, payment?: string, message_type?: string, image_url?: string) {
  const threadId = await getThread(toUserId);
  const wallet = await getActiveWallet()

  if (!wallet) throw new Error("No active wallet")

  const {data: { user }} = await supabase.auth.getUser();

  if (!user) throw new Error("Invalid session");

  const {cipher, nonce} = encryptMessageUsingSecret(
    text,
    threadId
  )

  // 📤 Store message in Supabase
  const { error: msgErr } = await supabase.from('chat_messages').insert({
    thread_id: threadId,
    sender_id: user.id,
    content: cipher,
    image_url: image_url ?? null,
    sender_wallet: wallet.publicKey.toBase58(),
    sig: "",
    nonce: nonce,
    payments: payment || null,
    message_type: message_type || "text",
  });

  if (msgErr) throw msgErr

  // 🔔 Trigger push notification via Edge Function
  await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/notify-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      to_user_id: toUserId,
      title: `New scan message`,
      body: text.slice(0, 100)
    })
  })
}

export async function getMessages(otherUserId: string) {
  const threadId = await getThread(otherUserId)

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*, payments(*)")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (error) throw error

  return data.map((msg: any) => {
    let decipheredMessage;
    let decrypted: string | null = null;
    if (msg.nonce && msg.sender_wallet && msg.content) {
      try {
        decipheredMessage = decryptMessageUsingSecret(msg.content, msg.nonce, threadId)
      } catch(error) {
        console.error("get messages - decipheredMessage error", error)
        decrypted = '🔒 Unable to Decrypt'
      }
    }

    return {
      ...msg,
      text: decrypted || decipheredMessage,
      encrypted: Boolean(msg.nonce)
    }
  })
}

// FUNCTIONS NEEDED BY THE `useChatMessages` hook to `function` properly
export function decryptChatMessages(threadId: string, chatData: ChatMessages[]) {
  // We're passing the threadId and not using the threadId from chatData so that we can be sure
  // that the threadId that wants to decrypt this message is from the origin where the chat was
  // encrypted in the first place.
  return chatData.map((msg) => {
    return decryptChatMessage(threadId, msg);
  })
}

export function decryptChatMessage(threadId: string, chatData: ChatMessages) {
  // We're passing the threadId and not using the threadId from chatData so that we can be sure
  // that the threadId that wants to decrypt this message is from the origin where the chat was
  // encrypted in the first place.
  let decipheredMessage;
  let decrypted: string | null = null;
  if (chatData.nonce && chatData.sender_wallet && chatData.content) {
    try {
      decipheredMessage = decryptMessageUsingSecret(chatData.content, chatData.nonce, threadId)
    } catch(error) {
      console.error("get messages - decipheredMessage error", error)
      decrypted = '🔒 Unable to Decrypt'
    }
  }

  return {
    ...chatData,
    decryptedContent: decrypted || decipheredMessage,
    encrypted: Boolean(chatData.nonce)
  }
}

export async function fetchMessages(threadId: string) {
  const { data, error } = await supabase
    .from(DBTables.ChatMessages)
    .select("*, payments(*)")
    .eq('thread_id', threadId)
    .range(0, 1000)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // return data as ChatMessages[];
  return data.map((msg: any) => {
    let decipheredMessage;
    let decrypted: string | null = null;
    if (msg.nonce && msg.sender_wallet && msg.content) {
      try {
        decipheredMessage = decryptMessageUsingSecret(msg.content, msg.nonce, threadId)
      } catch(error) {
        console.error("get messages - decipheredMessage error", error)
        decrypted = '🔒 Unable to Decrypt'
      }
    }

    const chats = {
      ...msg,
      decryptedContent: decrypted || decipheredMessage,
      encrypted: Boolean(msg.nonce)
    }
    console.log("fetching messages - ", chats)
    // cacheMessages(threadId, chats);
    return chats
  })
}

export const cacheMessages = async (threadId: string, messages: ChatMessages[]) => {
  try {
    await AsyncStorage.setItem(`${MESSAGES_CACHE_KEY}_${threadId}`, JSON.stringify(messages));
  } catch (e) {
    console.error('Error caching messages:', e);
  }
};

export const getCachedMessages = async (threadId: string): Promise<ChatMessages[]> => {
  try {
    const cached = await AsyncStorage.getItem(`${MESSAGES_CACHE_KEY}_${threadId}`);
    console.log("get Cached messages", cached, threadId);
    return cached ? Array.from(JSON.parse(cached)) : [];
    // return cached ? JSON.parse(cached) : fetchMessages(threadId);
  } catch (e) {
    console.error('Error getting cached messages:', e);
    return [];
  }
};

export const deleteCachedMessages = async (threadId: string) => {
  try {
    await AsyncStorage.removeItem(`${MESSAGES_CACHE_KEY}_${threadId}`);
  } catch (e) {
    console.error('Error deleting cached messages:', e);
  }
}

export const deleteAllCachedMessages = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const messagesKeys = keys.filter(key => key.startsWith(MESSAGES_CACHE_KEY));
    await AsyncStorage.multiRemove(messagesKeys);
  } catch (e) {
    console.error('Error deleting all cached messages:', e);
  }
}

// Message management
const sendChatMessage = async (params: {
  recipientId: string;
  newMessage: any;
}) => {
  try {
    await createMessage.mutateAsync(params);

    // Cache the new message
    const messages = await getCachedMessages(params.newMessage.thread_id);
    await cacheMessages(params.newMessage.thread_id, [
      params.newMessage,
      ...messages,
    ]);
  } catch (e) {
    setError(e instanceof Error ? e : new Error('Failed to send message'));
    throw e;
  }
};
