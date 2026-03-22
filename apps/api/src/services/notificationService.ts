import { ObjectId } from 'mongodb';
import { emitAndLog } from './socketService';
import { getDb } from '../config/db';
import { firebaseAdminService } from './firebaseAdminService';

export interface Notification {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  message: string;
  type: string;
  metadata?: any;
  isRead: boolean;
  createdAt: Date;
}

export class NotificationService {
  private get collection() {
    return getDb().collection('notifications');
  }

  /**
   * Send FCM push notification to a specific user by looking up their stored tokens.
   * This enables lock-screen / browser push notifications on all devices.
   */
  private async sendPushToUser(userId: string | ObjectId, title: string, message: string, metadata?: any) {
    try {
      const db = getDb();
      const user = await db.collection('users').findOne(
        { _id: new ObjectId(userId) },
        { projection: { fcmTokens: 1 } }
      );
      
      if (user?.fcmTokens && user.fcmTokens.length > 0) {
        await firebaseAdminService.sendPushNotification(
          user.fcmTokens,
          title,
          message,
          { ...metadata, targetUserId: userId.toString() }
        );
      }
    } catch (pushErr) {
      // Push is best-effort — never block the main notification flow
      console.error('[NotificationService] FCM push failed for user', userId.toString(), pushErr);
    }
  }

  async create(userId: string | ObjectId, title: string, message: string, type: string, metadata?: any) {
    const newNotification = {
      userId: new ObjectId(userId),
      title,
      message,
      type,
      metadata,
      isRead: false,
      createdAt: new Date()
    };
    
    try {
      const result = await this.collection.insertOne(newNotification);
      
      // Real-time socket delivery (in-app bell icon)
      try {
        emitAndLog(`user_${userId.toString()}`, 'notification', { 
           ...newNotification, 
           _id: result.insertedId 
        });
      } catch (socketErr) {
        console.error('[NotificationService] Socket emit failed:', socketErr);
      }

      // FCM push delivery (lock-screen / browser push)
      this.sendPushToUser(userId, title, message, { ...metadata, type });
      
      return { ...newNotification, _id: result.insertedId };
    } catch (dbErr) {
      console.error('[NotificationService] DB insert failed:', dbErr);
      // Still try to deliver via socket even if DB fails
      try {
        emitAndLog(`user_${userId.toString()}`, 'notification', newNotification);
      } catch (_) { /* silent */ }
      // Still try FCM even if DB fails
      this.sendPushToUser(userId, title, message, { ...metadata, type });
      return newNotification;
    }
  }

  /**
   * Compatibility method
   */
  async notifyUser(userId: string, title: string, message: string, type: string, metadata?: any) {
     const notif = await this.create(userId, title, message, type, metadata);
     
     // Blast specific event type for UI refresh
     try {
       emitAndLog(`user_${userId}`, type, metadata || {});
     } catch (_) {}
     
     return notif;
  }

  /**
   * Notify all admins
   */
  async notifyAdmins(title: string, message: string, type: string, metadata?: any) {
    try {
      const db = getDb();
      const admins = await db.collection('users').find({ role: 'admin' }).toArray();
      
      // Use allSettled so one failure doesn't stop others
      const tasks = admins.map(admin => this.create(admin._id, title, message, type, metadata));
      await Promise.allSettled(tasks);

      // Blast specific event type for UI refresh
      emitAndLog('admin_room', type, metadata || {});
    } catch (err) {
      console.error('[NotificationService] notifyAdmins failed:', err);
      try {
        emitAndLog('admin_room', type, metadata || {});
      } catch (_) {}
    }
  }

  /**
   * Notify all Scrap Champions
   */
  async notifyChamps(title: string, message: string, type: string, metadata?: any) {
    try {
      const db = getDb();
      const champs = await db.collection('users').find({ role: 'scrapChamp' }).toArray();
      
      const tasks = champs.map(champ => this.create(champ._id, title, message, type, metadata));
      await Promise.allSettled(tasks);

      // Blast specific event type for UI refresh
      emitAndLog('champ_room', type, metadata || {});
    } catch (err) {
      console.error('[NotificationService] notifyChamps failed:', err);
      try {
        emitAndLog('champ_room', type, metadata || {});
      } catch (_) {}
    }
  }

  async getForUser(userId: string) {
    try {
      return await this.collection.find({ userId: new ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
    } catch (err) {
      console.error('[NotificationService] getForUser failed:', err);
      return [];
    }
  }

  async markAsRead(notificationId: string, userId: string) {
    try {
      await this.collection.updateOne(
        { _id: new ObjectId(notificationId), userId: new ObjectId(userId) },
        { $set: { isRead: true } }
      );
    } catch (err) {
      console.error('[NotificationService] markAsRead failed:', err);
    }
  }

  async markAllAsRead(userId: string) {
    try {
      await this.collection.updateMany(
        { userId: new ObjectId(userId), isRead: false },
        { $set: { isRead: true } }
      );
    } catch (err) {
      console.error('[NotificationService] markAllAsRead failed:', err);
    }
  }

  async clearAll(userId: string) {
    try {
      await this.collection.deleteMany({ userId: new ObjectId(userId) });
    } catch (err) {
      console.error('[NotificationService] clearAll failed:', err);
    }
  }
}

export const notificationService = new NotificationService();
