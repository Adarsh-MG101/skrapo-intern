import dotenv from 'dotenv';
// Initialize env vars immediately before ANY other imports
dotenv.config({ path: 'apps/api/.env', override: true });
dotenv.config({ override: true });

import { app } from './app';
import { closeDatabaseConnection, connectToDatabase } from './config/db';
import { setupSchema } from './schema/setupCollections';
import { seedRoles } from './seeds/roles';
import { seedUsers } from './seeds/users';
import { initSocket } from './services/socketService';
import { startPickupReminderScheduler, stopPickupReminderScheduler } from './services/pickupReminderScheduler';

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 3333;

async function bootstrap() {
  const db = await connectToDatabase();
  console.log(`[db] connected successfully: ${db.databaseName}`);

  // Create / update collections, validators & indexes
  await setupSchema(db);

  // Seed default roles and admin
  await seedRoles();
  await seedUsers();

  const server = app.listen(port, host, () => {
    console.log(`[ready] http://${host}:${port}`);
  });

  initSocket(server);
  startPickupReminderScheduler();

  const shutdown = async () => {
    stopPickupReminderScheduler();
    await closeDatabaseConnection();
    console.log('[db] connection closed');
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[startup-error] ${message}`);
  process.exit(1);
});

// ── Global Safety Nets ────────────────────────────────────────────────
// Prevent the server from crashing due to unhandled errors in background
// tasks (e.g., broadcast retries, notification delivery, timer callbacks).
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[UNHANDLED REJECTION] The server caught an unhandled promise rejection.');
  console.error('[UNHANDLED REJECTION] Reason:', reason);
  // Log but do NOT exit — the server stays alive.
});

process.on('uncaughtException', (error: Error) => {
  console.error('[UNCAUGHT EXCEPTION] The server caught an uncaught exception.');
  console.error('[UNCAUGHT EXCEPTION] Error:', error.message);
  console.error('[UNCAUGHT EXCEPTION] Stack:', error.stack);
  // Log but do NOT exit — keeps the server running.
  // In production you may want to gracefully restart here instead.
});
