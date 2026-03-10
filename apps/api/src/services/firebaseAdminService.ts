import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (projectId && clientEmail && privateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
  }
} else {
  console.log('⚠️ Firebase credentials missing. Push notifications will be disabled.');
}

export const firebaseAdminService = {
  /**
   * Send push notification to a list of tokens or a single token
   */
  async sendPushNotification(tokens: string | string[], title: string, body: string, data?: any) {
    if (!admin.apps.length) return;

    try {
      const message: any = {
        notification: {
          title,
          body,
        },
        data: data || {},
      };

      if (Array.isArray(tokens)) {
        if (tokens.length === 0) return;
        
        // Multi-token messaging
        const response = await admin.messaging().sendEachForMulticast({
          tokens,
          ...message,
        });
        
        console.log(`[push] Multicast: Success count: ${response.successCount}, Failure count: ${response.failureCount}`);
      } else {
        // Single token messaging
        message.token = tokens;
        const response = await admin.messaging().send(message);
        console.log('[push] Sent single notification successfully:', response);
      }
    } catch (error) {
      console.error('[push] Error sending notification:', error);
    }
  }
};
