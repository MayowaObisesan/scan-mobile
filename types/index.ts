import { Tables, TablesInsert } from "./database.types";
import { DBTables } from "./enums";

export type Profiles = Tables<DBTables.Profiles>;
export type ProfilesInsert = TablesInsert<DBTables.Profiles>;
export type Wallets = Tables<DBTables.Wallets>;
export type WalletsInsert = TablesInsert<DBTables.Wallets>;
export type Payments = Tables<DBTables.Payments>;
export type PaymentsInsert = TablesInsert<DBTables.Payments>;
export type ChatMessages = Tables<DBTables.ChatMessages>;
export type ChatMessagesWithDecryptedMessage = Tables<DBTables.ChatMessages> & {decryptedContent: string; encrypted:boolean};
export type ChatMessagesInsert = TablesInsert<DBTables.ChatMessages>;
export type ChatThreads = Tables<DBTables.ChatThreads>;
export type ChatThreadsInsert = TablesInsert<DBTables.ChatThreads>;
