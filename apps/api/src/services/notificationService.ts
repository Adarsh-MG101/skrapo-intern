import { getDb } from '../config/db';
import { firebaseAdminService } from './firebaseAdminService';
import { emitAndLog } from './socketService';
import { ObjectId } from 'mongodb';

export const notificationService = {
  /**
   * Send notification via both Socket.io and FCM
   */
  async notifyUser(userId: string, title: string, body: string, event: string, data: any) {
    // 1. Send via Socket.io
    emitAndLog(`user_${userId}`, event, { title, body, ...data });

    // 2. Send via FCM
    try {
      const db = getDb();
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      
      if (user && user.fcmTokens && Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
        await firebaseAdminService.sendPushNotification(user.fcmTokens, title, body, data);
      }
    } catch (error) {
      console.error('[notificationService] Failed to send push to user:', userId, error);
    }
  },

  /**
   * Notify all admins
   */
  async notifyAdmins(title: string, body: string, event: string, data: any) {
    // 1. Send via Socket.io
    emitAndLog('admin_room', event, { title, body, ...data });

    // 2. Send via FCM
    try {
      const db = getDb();
      const admins = await db.collection('users')
        .find({ role: 'admin' })
        .project({ fcmTokens: 1 })
        .toArray();
      
      const tokens = admins.flatMap(a => a.fcmTokens || []).filter(t => !!t);
      if (tokens.length > 0) {
        await firebaseAdminService.sendPushNotification(tokens, title, body, data);
      }
    } catch (error) {
      console.error('[notificationService] Failed to send push to admins:', error);
    }
  },

  /**
   * Notify all Scrap Champions (or a subset)
   */
  async notifyChamps(title: string, body: string, event: string, data: any, filter: any = {}) {
    // 1. Send via Socket.io
    emitAndLog('champ_room', event, { title, body, ...data });

    // 2. Send via FCM
    try {
       const db = getDb();
       const query = { role: 'scrapChamp', ...filter };
       const champs = await db.collection('users')
         .find(query)
         .project({ fcmTokens: 1 })
         .toArray();
       
       const tokens = champs.flatMap(c => c.fcmTokens || []).filter(t => !!t);
       if (tokens.length > 0) {
         await firebaseAdminService.sendPushNotification(tokens, title, body, data);
       }
    } catch (error) {
      console.error('[notificationService] Failed to send push to champs:', error);
    }
  }
};
