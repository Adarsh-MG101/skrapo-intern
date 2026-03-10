import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

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
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[FCM] Service workers not supported');
    return null;
  }

  // Check if Firebase Messaging is supported on this browser
  const supported = await isSupported();
  if (!supported) {
    console.log('[FCM] Firebase Messaging is not supported on this browser');
    return null;
  }

  try {
    // Request notification permission FIRST (important for mobile)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FCM] Notification permission denied');
      return null;
    }

    // Prepare config for the service worker (since it's a static file in 'public', it can't read process.env)
    const swConfigUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
    swConfigUrl.searchParams.set('apiKey', process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '');
    swConfigUrl.searchParams.set('authDomain', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '');
    swConfigUrl.searchParams.set('projectId', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '');
    swConfigUrl.searchParams.set('storageBucket', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '');
    swConfigUrl.searchParams.set('messagingSenderId', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '');
    swConfigUrl.searchParams.set('appId', process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '');

    // Register service worker with explicit scope
    const registration = await navigator.serviceWorker.register(swConfigUrl.toString(), {
      scope: '/',
    });

    // Wait for the service worker to be ready (critical for mobile)
    await navigator.serviceWorker.ready;
    console.log('[FCM] Service worker ready');

    const messaging = getMessaging(app);
    
    // Get FCM registration token
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('[FCM] Token acquired:', token.substring(0, 20) + '...');
      
      // Save token to backend
      await apiFetch('/auth/fcm-token', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });

      return token;
    } else {
      console.log('[FCM] No registration token available.');
      return null;
    }
  } catch (err: any) {
    // Don't crash the app if FCM fails — just log it
    console.error('[FCM] Setup error:', err?.message || err);
    return null;
  }
};

export const onMessageListener = (callback: (payload: any) => void) => {
  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      callback(payload);
    });
  } catch (err) {
    console.error('[FCM] onMessage listener error:', err);
    return () => {}; // Return noop unsubscribe
  }
};
