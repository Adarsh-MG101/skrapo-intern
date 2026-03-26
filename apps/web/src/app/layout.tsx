import '../main.css';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { SocketProvider } from './context/SocketContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { FCMInitializer } from '../components/common/FCMInitializer';
import { NotificationPrompt } from './components/common/NotificationPrompt';

// IMPORTANT: Replace this with your actual Google Client ID from the Google Cloud Console
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export const metadata = {
  title: 'Recyclemybin - Smart Scrap Pickup Scheduling',
  description: 'Recyclemybin connects you with scrap champions for hassle-free doorstep scrap collection. Schedule pickups, track orders, and contribute to a greener future.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Skrapo" />
        <meta name="theme-color" content="#16a34a" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <ToastProvider>
            <AuthProvider>
              <SocketProvider>
                <NotificationPrompt />
                <FCMInitializer />
                {children}
              </SocketProvider>
            </AuthProvider>
          </ToastProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
