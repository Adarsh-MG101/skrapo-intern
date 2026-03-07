import { getDb } from '../config/db';

const ROLES = [
  { code: 'customer', name: 'Customer' },
  { code: 'admin', name: 'Admin' },
  { code: 'scrapChamp', name: 'Scrap Champ' },
];

export async function seedRoles(): Promise<void> {
  const db = getDb();
  const rolesCollection = db.collection('roles');

  for (const role of ROLES) {
    const existing = await rolesCollection.findOne({ code: role.code });
    if (!existing) {
      await rolesCollection.insertOne({
        code: role.code,
        name: role.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`[seed] Created role: ${role.code}`);
    }
  }
}
