import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const setupFCM = async (apiFetch: any): Promise<string | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    // Prepare config for the service worker (since it's a static file in 'public', it can't read process.env)
    const swConfigUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
    swConfigUrl.searchParams.set('apiKey', process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '');
    swConfigUrl.searchParams.set('authDomain', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '');
    swConfigUrl.searchParams.set('projectId', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '');
    swConfigUrl.searchParams.set('storageBucket', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '');
    swConfigUrl.searchParams.set('messagingSenderId', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '');
    swConfigUrl.searchParams.set('appId', process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '');

    // Custom registration to pass configuration
    const registration = await navigator.serviceWorker.register(swConfigUrl.toString());
    const messaging = getMessaging(app);
    
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get FCM registration token
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('FCM Token:', token);
      
      // Save token to backend
      await apiFetch('/auth/fcm-token', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });

      return token;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
};

export const onMessageListener = (callback: (payload: any) => void) => {
  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};
