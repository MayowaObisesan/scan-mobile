import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const DB_NAME = 'com.create.scan.db'

const expo = SQLite.openDatabaseSync(
  DB_NAME,
  {
    enableChangeListener: true  // enable ChangeListener
  }
);

const db = drizzle(expo, { schema });

export {db, expo, DB_NAME};
