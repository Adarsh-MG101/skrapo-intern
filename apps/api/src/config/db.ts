import { Db, MongoClient } from 'mongodb';

let mongoClient: MongoClient | null = null;
let database: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  const mongoUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/';
  const dbName = process.env.MONGODB_DB_NAME ?? 'skrapo';

  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 10000,   // Wait up to 10s to find a server
    socketTimeoutMS: 45000,            // Close sockets after 45s of inactivity
    connectTimeoutMS: 10000,           // Connection attempt timeout
    heartbeatFrequencyMS: 15000,       // Check server health every 15s
    retryWrites: true,
    retryReads: true,
  });
  
  await client.connect();

  // Log connection pool events for debugging
  client.on('connectionPoolCleared', () => {
    console.warn('[db] ⚠️ Connection pool cleared — MongoDB may have disconnected temporarily.');
  });

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
