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
   * Send push notification to a list of tokens or a single token.
   * 
   * MOBILE FIX: We send data-only messages with webpush/android/apns notification configs.
   * Using the top-level `notification` key causes mobile web browsers (especially iOS Safari
   * and Android Chrome PWA) to silently drop push notifications because the browser tries to
   * auto-handle them and fails when the page is in the background.
   * 
   * By using platform-specific configs + data payload, the service worker gets full control
   * via onBackgroundMessage and can reliably call showNotification().
   */
  async sendPushNotification(tokens: string | string[], title: string, body: string, data?: any) {
    if (!admin.apps.length) return;

    try {
      // FCM data values MUST all be strings
      const safeData: Record<string, string> = { title, body };
      if (data) {
        for (const [key, value] of Object.entries(data)) {
          if (value !== null && value !== undefined) {
            safeData[key] = typeof value === 'string' ? value : JSON.stringify(value);
          }
        }
      }

      const notificationPayload = {
        title,
        body,
      };

      if (Array.isArray(tokens)) {
        if (tokens.length === 0) return;
        
        const message: admin.messaging.MulticastMessage = {
          tokens,
          data: safeData,
          webpush: {
            notification: {
              ...notificationPayload,
              icon: '/skrapo-logo.png',
              badge: '/skrapo-logo.png',
              requireInteraction: true,
            },
            fcmOptions: {
              link: '/',
            },
          },
          android: {
            priority: 'high' as const,
            notification: {
              ...notificationPayload,
              icon: 'ic_notification',
              channelId: 'skrapo_default',
              priority: 'high' as any,
              defaultSound: true,
              defaultVibrateTimings: true,
            },
          },
          apns: {
            payload: {
              aps: {
                alert: notificationPayload,
                badge: 1,
                sound: 'default',
                contentAvailable: true,
              },
            },
          },
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[push] Multicast: Success: ${response.successCount}, Failure: ${response.failureCount}`);
        
        // Log individual failures for debugging
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`[push] Token [${idx}] failed:`, resp.error?.message);
          }
        });
      } else {
        const message: admin.messaging.Message = {
          token: tokens,
          data: safeData,
          webpush: {
            notification: {
              ...notificationPayload,
              icon: '/skrapo-logo.png',
              badge: '/skrapo-logo.png',
              requireInteraction: true,
            },
            fcmOptions: {
              link: '/',
            },
          },
          android: {
            priority: 'high' as const,
            notification: {
              ...notificationPayload,
              icon: 'ic_notification',
              channelId: 'skrapo_default',
              priority: 'high' as any,
              defaultSound: true,
              defaultVibrateTimings: true,
            },
          },
          apns: {
            payload: {
              aps: {
                alert: notificationPayload,
                badge: 1,
                sound: 'default',
                contentAvailable: true,
              },
            },
          },
        };

        const response = await admin.messaging().send(message);
        console.log('[push] Sent single notification successfully:', response);
      }
    } catch (error) {
      console.error('[push] Error sending notification:', error);
    }
  }
};
