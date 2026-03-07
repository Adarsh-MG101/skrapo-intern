import { Db, MongoClient } from 'mongodb';

let mongoClient: MongoClient | null = null;
let database: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  const mongoUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/';
  const dbName = process.env.MONGODB_DB_NAME ?? 'skrapo';

  const client = new MongoClient(mongoUri);
  await client.connect();

  const db = client.db(dbName);
  try {
    await db.command({ ping: 1 });
  } catch (error) {
    await client.close();
    throw error;
  }

  mongoClient = client;
  database = db;
  return db;
}

export function getDb(): Db {
  if (!database) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return database;
}

export function isDatabaseConnected(): boolean {
  return database !== null;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    database = null;
  }
}
