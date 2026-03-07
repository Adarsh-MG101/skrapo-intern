import bcrypt from 'bcryptjs';
import { getDb } from '../config/db';

export async function seedUsers(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Skrapo Admin';

  if (!email || !password) {
    console.log('[seed] ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin seed.');
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();
  const usersCol = db.collection('users');
  const rolesCol = db.collection('roles');
  const userRolesCol = db.collection('user_roles');

  // Hash current password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const now = new Date();

  // Find admin role
  const adminRole = await rolesCol.findOne({ code: 'admin' });
  if (!adminRole) {
    console.error('[seed] Admin role not found. Ensure roles are seeded first.');
    return;
  }

  // Check if admin user already exists
  const existingUser = await usersCol.findOne({ email: normalizedEmail });
  
  if (existingUser) {
    // Update existing admin to ensure password and role are correct
    await usersCol.updateOne(
      { _id: existingUser._id },
      { 
        $set: { 
          passwordHash, 
          role: 'admin',
          updatedAt: now 
        } 
      }
    );
    
    // Ensure role linkage in user_roles
    const existingRoleLink = await userRolesCol.findOne({ 
      userId: existingUser._id, 
      roleId: adminRole._id 
    });
    
    if (!existingRoleLink) {
      await userRolesCol.insertOne({
        userId: existingUser._id,
        roleId: adminRole._id,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(`[seed] Admin user updated/verified: ${normalizedEmail}`);
    return;
  }

  // Create fresh admin user
  const userResult = await usersCol.insertOne({
    name,
    email: normalizedEmail,
    passwordHash,
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  });

  // Assign admin role
  await userRolesCol.insertOne({
    userId: userResult.insertedId,
    roleId: adminRole._id,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`[seed] Admin user created: ${normalizedEmail}`);
}
