export enum DBTables {
  Profiles = "profiles",
  ChatMessages = "chat_messages",
  ChatThreads = "chat_threads",
  Payments = "payments",
  Wallets = "wallets",
  TxRiskLogs = "tx_risk_logs",
}

export enum PaymentStatus {
  pending = 'pending',
  completed = 'completed',
  failed = 'failed',
}

export enum ChatMessageType {
  text = 'text',
  payment = 'payment',
  image = 'image',
  paymentLink = 'paymentLink',
}

export enum ReadStatus {
  delivered = 'delivered',  // If successfully sent to server - Step 3
  pending = 'pending',  // If user is offline - Step 1
  read = 'read',  // If user reads the message - Step 4
  sent = 'sent',  // If user is online - Step 2
}

export enum SyncStatus {
  failed = 'failed',  // Error occurred when sending to server, maybe user is offline
  pending = 'pending',  // If user is offline and sending to server
  synced = 'synced',  // Successfully sent to server
  syncing = 'syncing',  // Sending to server in progress
}
