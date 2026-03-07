/**
 * MongoDB Schema Setup
 * Creates collections with JSON-Schema validators and indexes
 * as defined in Requirements/DATA_API.md.
 *
 * Safe to run multiple times – uses createCollection only when
 * the collection does not yet exist, and createIndex is idempotent.
 */
import { Db } from 'mongodb';

/* ------------------------------------------------------------------ */
/*  Helper: create a collection with validator if it doesn't exist     */
/* ------------------------------------------------------------------ */
async function ensureCollection(
  db: Db,
  name: string,
  validator?: Record<string, unknown>
): Promise<void> {
  const existing = await db
    .listCollections({ name })
    .toArray();

  if (existing.length === 0) {
    await db.createCollection(name, {
      ...(validator ? { validator } : {}),
    });
    console.log(`[schema] Created collection: ${name}`);
  } else {
    // Update validator on existing collection if provided
    if (validator) {
      await db.command({ collMod: name, validator });
      console.log(`[schema] Updated validator for: ${name}`);
    }
  }
}

/* ================================================================== */
/*  Collection definitions                                             */
/* ================================================================== */

async function setupUsersCollection(db: Db): Promise<void> {
  const validator = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'createdAt', 'updatedAt'],
      properties: {
        name:             { bsonType: 'string', description: 'User display name' },
        mobileNumber:     { bsonType: 'string', description: 'Mobile phone number' },
        email:            { bsonType: 'string', description: 'Email address (admin seed)' },
        googleId:         { bsonType: 'string', description: 'Google OAuth ID' },
        passwordHash:     { bsonType: 'string', description: 'Hashed password (admin)' },
        pickupAddress:    { bsonType: 'string', description: 'Default pickup address (customer)' },
        serviceArea:      { bsonType: 'string', description: 'Human-readable service area (scrapChamp)' },
        serviceGeo: {
          bsonType: 'object',
          description: 'GeoJSON Point for nearest matching (scrapChamp)',
          required: ['type', 'coordinates'],
          properties: {
            type:        { bsonType: 'string', enum: ['Point'] },
            coordinates: { bsonType: 'array', description: '[longitude, latitude]' },
          },
        },
        serviceRadiusKm:  { bsonType: 'number', description: 'Service radius in km (default 5)' },
        createdAt:        { bsonType: 'date' },
        updatedAt:        { bsonType: 'date' },
      },
    },
  };

  await ensureCollection(db, 'users', validator);

  const col = db.collection('users');
  await col.createIndex({ mobileNumber: 1 }, { unique: true, sparse: true });
  await col.createIndex({ email: 1 },        { unique: true, sparse: true });
  await col.createIndex({ googleId: 1 },      { unique: true, sparse: true });
  await col.createIndex({ serviceGeo: '2dsphere' }, { sparse: true });
  console.log('[schema] users indexes ensured');
}

async function setupRolesCollection(db: Db): Promise<void> {
  const validator = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['code', 'name', 'createdAt', 'updatedAt'],
      properties: {
        code:      { bsonType: 'string', enum: ['customer', 'admin', 'scrapChamp'] },
        name:      { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  };

  await ensureCollection(db, 'roles', validator);

  const col = db.collection('roles');
  await col.createIndex({ code: 1 }, { unique: true });
  console.log('[schema] roles indexes ensured');
}

async function setupUserRolesCollection(db: Db): Promise<void> {
  const validator = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'roleId', 'createdAt', 'updatedAt'],
      properties: {
        userId:    { bsonType: 'objectId' },
        roleId:    { bsonType: 'objectId' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  };

  await ensureCollection(db, 'user_roles', validator);

  const col = db.collection('user_roles');
  await col.createIndex({ userId: 1, roleId: 1 }, { unique: true });
  await col.createIndex({ userId: 1 });
  await col.createIndex({ roleId: 1 });
  console.log('[schema] user_roles indexes ensured');
}

async function setupOrdersCollection(db: Db): Promise<void> {
  const ORDER_STATUSES = ['New', 'Requested', 'Assigned', 'Accepted', 'Completed', 'Problem', 'Cancelled'];

  const validator = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['customerId', 'scrapTypes', 'scheduledAt', 'status', 'createdAt', 'updatedAt'],
      properties: {
        customerId:            { bsonType: 'objectId', description: 'Ref -> users._id (customer)' },
        scrapTypes:            { bsonType: 'array',    description: 'Selected scrap types with optional extra text' },
        estimatedWeight:       { bsonType: 'object',   description: '{ [scrapType]: estimatedKg }' },
        photoUrl:              { bsonType: 'string' },
        scheduledAt:           { bsonType: 'date',     description: 'Pickup slot start' },
        scheduledSlotDuration: { bsonType: 'number',   description: 'Duration in hours (default 1)' },
        generalArea:           { bsonType: 'string' },
        exactAddress:          { bsonType: 'string' },
        assignedScrapChampId:  { bsonType: ['objectId', 'null'], description: 'Ref -> users._id (scrapChamp)' },
        status:                { bsonType: 'string', enum: ORDER_STATUSES },
        problemNotes:          { bsonType: ['string', 'null'] },
        reminderSentAt:        { bsonType: 'date',     description: 'When pickup reminder SMS was sent' },
        createdAt:             { bsonType: 'date' },
        updatedAt:             { bsonType: 'date' },
      },
    },
  };

  await ensureCollection(db, 'orders', validator);

  const col = db.collection('orders');
  await col.createIndex({ customerId: 1 });
  await col.createIndex({ assignedScrapChampId: 1 }, { sparse: true });
  await col.createIndex({ status: 1 });
  await col.createIndex({ scheduledAt: 1 });
  await col.createIndex({ createdAt: -1 });
  console.log('[schema] orders indexes ensured');
}

async function setupFeedbackCollection(db: Db): Promise<void> {
  const validator = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['orderId', 'customerId', 'rating', 'createdAt'],
      properties: {
        orderId:             { bsonType: 'objectId', description: 'Ref -> orders._id' },
        customerId:          { bsonType: 'objectId', description: 'Ref -> users._id (customer)' },
        rating:              { bsonType: 'int',      minimum: 1, maximum: 5 },
        weight:              { bsonType: ['double', 'number', 'null'] },
        price:               { bsonType: ['double', 'number', 'null'] },
        behavior:            { bsonType: ['string', 'null'], enum: ['Professional', 'Friendly', 'Late', 'Unprofessional', null] },
        comments:            { bsonType: ['string', 'null'] },
        createdAt:           { bsonType: 'date' },
      },
    },
  };

  await ensureCollection(db, 'feedback', validator);

  const col = db.collection('feedback');
  await col.createIndex({ orderId: 1 },    { unique: true }); // one feedback per order
  await col.createIndex({ customerId: 1 });
  console.log('[schema] feedback indexes ensured');
}

async function setupSmsEventsCollection(db: Db): Promise<void> {
  const EVENT_TYPES = [
    'OTP',
    'AllocationAssigned',
    'AllocationReassigned',
    'CustomerConfirmation',
    'ChampReminder',
    'CustomerFeedback',
  ];

  const validator = {
    $jsonSchema: {
      bsonType: 'object',
    required: ['eventType', 'status', 'createdAt'],
    properties: {
      orderId:      { bsonType: ['objectId', 'null'], description: 'Nullable for OTP events' },
      userId:       { bsonType: ['objectId', 'null'], description: 'Ref -> users._id (recipient)' },
      mobileNumber: { bsonType: 'string', description: 'Target mobile number' },
      eventType:    { bsonType: 'string', enum: EVENT_TYPES },
      status:       { bsonType: 'string', enum: ['Queued', 'Sent', 'Delivered', 'Failed', 'Clicked'] },
      linkId:       { bsonType: ['string', 'null'], description: 'For click tracking' },
      meta:         { bsonType: 'object', description: 'Generic metadata (OTP / provider traces)' },
      createdAt:    { bsonType: 'date' },
    },
    },
  };

  await ensureCollection(db, 'smsEvents', validator);

  const col = db.collection('smsEvents');
  await col.createIndex({ orderId: 1 },   { sparse: true });
  await col.createIndex({ userId: 1 });
  await col.createIndex({ eventType: 1 });
  await col.createIndex({ createdAt: -1 });
  console.log('[schema] smsEvents indexes ensured');
}

async function setupAuthSessionsCollection(db: Db): Promise<void> {
  const validator = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'refreshTokenHash', 'expiresAt', 'createdAt', 'updatedAt'],
      properties: {
        userId:           { bsonType: 'objectId', description: 'Ref -> users._id' },
        refreshTokenHash: { bsonType: 'string',   description: 'Hashed refresh token (never plain text)' },
        userAgent:        { bsonType: ['string', 'null'] },
        ipAddress:        { bsonType: ['string', 'null'] },
        expiresAt:        { bsonType: 'date' },
        revokedAt:        { bsonType: ['date', 'null'] },
        createdAt:        { bsonType: 'date' },
        updatedAt:        { bsonType: 'date' },
      },
    },
  };

  await ensureCollection(db, 'authSessions', validator);

  const col = db.collection('authSessions');
  await col.createIndex({ userId: 1 });
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL – auto-delete expired
  await col.createIndex({ refreshTokenHash: 1 });
  console.log('[schema] authSessions indexes ensured');
}

/* ================================================================== */
/*  Public entry point                                                 */
/* ================================================================== */

export async function setupSchema(db: Db): Promise<void> {
  console.log('[schema] Setting up MongoDB collections & indexes …');

  try {
    console.log('[schema] Processing: users');
    await setupUsersCollection(db);
    
    console.log('[schema] Processing: roles');
    await setupRolesCollection(db);
    
    console.log('[schema] Processing: user_roles');
    await setupUserRolesCollection(db);
    
    console.log('[schema] Processing: orders');
    await setupOrdersCollection(db);
    
    console.log('[schema] Processing: feedback');
    await setupFeedbackCollection(db);
    
    console.log('[schema] Processing: smsEvents');
    await setupSmsEventsCollection(db);
    
    console.log('[schema] Processing: authSessions');
    await setupAuthSessionsCollection(db);

    console.log('[schema] All collections & indexes ready ✓');
  } catch (err: any) {
    console.error(`[schema] FATAL ERROR during setup: ${err.message}`);
    throw err;
  }
}
