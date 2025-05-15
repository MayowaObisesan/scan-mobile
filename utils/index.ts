import * as Clipboard from 'expo-clipboard';

import * as FileSystem from 'expo-file-system';
import * as Crypto from "expo-crypto";
import {ChatMessages, ChatThreads, Profiles} from "~/types";
import {Message, Profile, Thread} from "~/db/schema";
import {decryptMessageUsingSecret} from "~/lib/crypto";

export const copyStringToClipboard = async (text: string) => {
  return await Clipboard.setStringAsync(text);
};

export const copyUrlToClipboard = async (text: string) => {
  return await Clipboard.setUrlAsync(text);
};

export const convertLamportToSol = (lamportBalance: number) => {
  return lamportBalance / 1_000_000_000;
}

export const shortenAddress = (addr: string) => {
  return `${addr?.substring(0, 6)}...${addr?.substring(addr.length - 4)}`;
};

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}


export const formatDate = (time: number) => {
  // Convert the timestamp to milliseconds by multiplying it by 1000
  const date = new Date(time * 1000);

  // Get the year, month, and day components
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Months are zero-based, so add 1 to get the correct month
  const day = date.getDate();
  const hrs = date.getHours();
  const mins = date.getMinutes();

  // Create an array of month names to map the numeric month to its name
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Get the month name using the month value as an index in the monthNames array
  const monthName = monthNames[month - 1];

  const formattedDate = `${monthName} ${day}, ${year} ${hrs}:${mins}`;

  return formattedDate;
};

export const formatDateShort = (time: number) => {
  // Create a new Date object
  const currentDate = new Date(time * 1000);

  // Get hours and minutes
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();

  // Determine whether it's AM or PM
  const amOrPm = hours >= 12 ? "pm" : "am";

  // Convert hours to 12-hour format
  const formattedHours = hours % 12 || 12;

  // Format the time string
  const formattedTime = `${formattedHours}:${
    minutes < 10 ? "0" : ""
  }${minutes} ${amOrPm}`;

  // Log the result
  // console.log(formattedTime);
  return formattedTime;
};

export const exportTransactionsToCSV = async (transactions: any[]) => {
  const headers = ['Signature', 'Timestamp', 'Type', 'Amount (SOL)', 'Other Party', 'Status'];
  const rows = transactions.map((tx) => [
    tx.signature,
    new Date(tx.timestamp * 1000).toISOString(),
    tx.type,
    tx.amount.toFixed(4),
    tx.otherParty,
    tx.status,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.join(','))
    .join('\n');

  const fileUri = FileSystem.documentDirectory + 'transactions.csv';
  await FileSystem.writeAsStringAsync(fileUri, csvContent);

  return fileUri;
};

export function convertChatMessageToLocalMessage(data: ChatMessages[]) {
  return data.map((message) => {
    return {
      id: message.id,
      threadId: message.thread_id,
      senderId: message.sender_id,
      content: message.content,
      nonce: message.nonce,
      sig: message.sig,
      read: message.read,
      deleted: message.deleted,
      messageType: message.message_type,
      payments: message.payments,
      imageUrl: message.image_url,
      createdAt: message.created_at,
      updatedAt: message.updated_at,
      syncStatus: message.sync_status,
      readStatus: message.read_status,
      localCreatedAt: message.local_created_at
    };
  })
}

export function convertLocalMessageToSyncMessage(data: Partial<Message[]>) {
  return data.map((message) => {
    return {
      id: message?.id,
      thread_id: message?.threadId,
      senderId: message?.senderId,
      content: message?.content,
      nonce: message?.nonce,
      sig: message?.sig,
      read: message?.read,
      deleted: message?.deleted,
      message_type: message?.messageType,
      payments: message?.payments,
      image_url: message?.imageUrl,
      created_at: message?.createdAt,
      updated_at: message?.updatedAt,
      sync_status: message?.syncStatus,
      read_status: message?.readStatus,
      local_created_at: message?.localCreatedAt
    };
  })
}

export function convertChatThreadsToLocalThreads(data: ChatThreads[]) {
  return data.map(thread => {
    return {
      id: thread.id,
      createdAt: thread.created_at,
      user1Id: thread.user1_id,
      user2Id: thread.user2_id,
    }
  })
}

export function convertLocalThreadsToServerThreads(data: Thread[]) {
  return data.map(thread => {
    return {
      id: thread.id,
      created_at: thread.createdAt,
      user1_id: thread.user1Id,
      user2_id: thread.user2Id,
    }
  })
}

export function convertServerProfileToLocalProfile(data: Profiles[]) {
  return data.map(profile => {
    return {
      id: profile.id,
      createdAt: profile.created_at,
      bio: profile.bio,
      phone: profile.phone,
      username: profile.username,
      avatarUrl: profile.avatar_url,
      expoPushToken: profile.expo_push_token,
      wallets: profile.wallets,
      riskThreshold: profile.risk_threshold,
      riskAlertsEnabled: profile.risk_alerts_enabled,
    }
  })
}

export function convertLocalProfileToServerProfile(data: Profile[]) {
  return data.map(profile => {
    return {
      id: profile.id,
      created_at: profile.createdAt,
      bio: profile.bio,
      phone: profile.phone,
      username: profile.username,
      avatar_url: profile.avatarUrl,
      expo_push_token: profile.expoPushToken,
      wallets: profile.wallets,
      risk_threshold: profile.riskThreshold,
      risk_alerts_enabled: profile.riskAlertsEnabled,
    }
  })
}

export function decryptMessage(message: Message) {
  const decrypted = decryptMessageUsingSecret(
    message.content,
    message.nonce!,
    message.threadId
  );

  if (!decrypted) {
    console.error("Failed to decrypt message - from utils decrypt message");
    return null;
  }
  return decrypted;
}

// Currency symbol map
const currencySymbolMap: Record<string, string> = {
  USD: '$',
  EUR: '€',
  NGN: '₦',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  INR: '₹',
  CNY: '¥',
  CHF: 'CHF',
};

// Function to get the currency symbol by code
export function getCurrencySymbol(currencyCode: string): string {
  return currencySymbolMap[currencyCode.toUpperCase()] || '';
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol} ${amount.toFixed(2)}`;
}
