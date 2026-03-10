importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

// Parse configuration from the registration URL (passed from setupFCM in src/utils/fcm.ts)
// This allows us to use environment variables in a static file in the 'public' folder.
const params = new URL(self.location).searchParams;

const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    // MOBILE FIX: Support both notification and data-only payloads.
    // The backend now sends data-only messages with webpush config for reliability,
    // but we also handle legacy notification payloads for backwards compatibility.
    const title = 
      (payload.notification && payload.notification.title) || 
      (payload.data && payload.data.title) || 
      'Skrapo';
    
    const body = 
      (payload.notification && payload.notification.body) || 
      (payload.data && payload.data.body) || 
      'You have a new notification';

    const notificationOptions = {
      body: body,
      icon: '/skrapo-logo.png',
      badge: '/skrapo-logo.png',
      // MOBILE: vibrate pattern ensures the phone buzzes
      vibrate: [100, 50, 100],
      // MOBILE: tag prevents duplicate notifications
      tag: 'skrapo-' + Date.now(),
      // MOBILE: renotify allows new notifications with same tag to alert again
      renotify: true,
      // MOBILE: requireInteraction keeps notification visible until user interacts
      requireInteraction: true,
      // Pass data through for click handling
      data: payload.data || {},
    };

    // IMPORTANT: Must return the promise from showNotification
    // so the service worker stays alive until the notification is displayed
    return self.registration.showNotification(title, notificationOptions);
  });

  // Handle notification click — open the app
  self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click:', event);
    event.notification.close();

    // Focus existing window or open new one
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  });
} else {
  console.log('[firebase-messaging-sw.js] Background messaging disabled: No config provided.');
}
