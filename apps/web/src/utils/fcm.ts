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
    console.log('[FCM] Permission state:', Notification.permission);
    if (Notification.permission === 'default') {
      console.log('[FCM] Requesting permission...');
    }
    
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission denied or ignored:', permission);
      return null;
    }

    // Prepare config for the service worker (since it's a static file in 'public', it can't read process.env)
    const swConfigUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
    const configParams = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    Object.entries(configParams).forEach(([key, val]) => {
      if (val) swConfigUrl.searchParams.set(key, val);
    });

    console.log('[FCM] Registering service worker...');
    // Register service worker with explicit scope
    const registration = await navigator.serviceWorker.register(swConfigUrl.toString(), {
      scope: '/',
      updateViaCache: 'none'
    });

    // Wait for the service worker to be ready (critical for mobile)
    await navigator.serviceWorker.ready;
    console.log('[FCM] Service worker ready and active');

    const messaging = getMessaging(app);
    
    // Get FCM registration token
    console.log('[FCM] Extracting token with VAPID key...');
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('[FCM] Token acquired successfully');
      
      // Save token to backend (with retry for mobile auth timing)
      const saveToken = async (attempt = 1) => {
        try {
          console.log(`[FCM] Saving token to backend (Attempt ${attempt})...`);
          const res = await apiFetch('/auth/fcm-token', {
            method: 'POST',
            body: JSON.stringify({ token }),
          });
          
          if (res.ok) {
            console.log('[FCM] Token saved successfully');
          } else {
            const errData = await res.json().catch(() => ({}));
            throw new Error(`Backend rejected token (${res.status}): ${errData.error || 'Unknown error'}`);
          }
        } catch (err: any) {
          console.warn(`[FCM] Token save attempt ${attempt} failed:`, err.message);
          if (attempt < 3) {
            console.log('[FCM] Retrying save in 3s...');
            setTimeout(() => saveToken(attempt + 1), 3000);
          }
        }
      };
      
      saveToken();
      return token;
    } else {
      console.error('[FCM] No registration token available (getToken returned null)');
      return null;
    }
  } catch (err: any) {
    console.error('[FCM] Fatal setup error:', err);
    if (err?.code === 'messaging/permission-blocked') {
      console.error('[FCM] Browser blocked permission request.');
    }
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
