'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '../../app/context/AuthContext';
import { setupFCM, onMessageListener } from '../../utils/fcm';
import { useToast } from '../../app/components/common/Toast';

export const FCMInitializer = () => {
    const { isAuthenticated, apiFetch, user } = useAuth();
    const { showToast } = useToast();
    const fcmInitialized = useRef(false);
    const lastNotificationId = useRef<string>('');

    useEffect(() => {
        if (!isAuthenticated || !user?.id) return;

        // Prevent duplicate FCM registration across re-renders
        if (fcmInitialized.current) return;
        fcmInitialized.current = true;

        // Register for FCM
        setupFCM(apiFetch).then(token => {
            if (token) {
                console.log('✅ FCM Ready for user:', user.id);
            } else {
                // Reset so it can retry on next auth change
                fcmInitialized.current = false;
            }
        }).catch(() => {
            fcmInitialized.current = false;
        });

        // Foreground listener — shows in-app toast when push arrives while app is open.
        // Deduplicate: track the last notification to avoid showing the same one twice
        // (which can happen when both socket and FCM fire for the same event).
        const unsubscribe = onMessageListener((payload: any) => {
            console.log('[FCM] Foreground message:', payload);
            
            const title = payload.notification?.title || payload.data?.title;
            const body = payload.notification?.body || payload.data?.body;
            
            if (title && body) {
                // Create a simple dedup key from title + body
                const notifId = `${title}:${body}`;
                if (notifId === lastNotificationId.current) {
                    console.log('[FCM] Skipping duplicate foreground notification');
                    return;
                }
                lastNotificationId.current = notifId;
                
                // Clear the dedup key after 5 seconds so same-content notifications can show again later
                setTimeout(() => {
                    if (lastNotificationId.current === notifId) {
                        lastNotificationId.current = '';
                    }
                }, 5000);

                showToast(`${title}: ${body}`, 'info', true);
            }
        });

        return () => {
            unsubscribe();
            fcmInitialized.current = false;
        };
    // Only re-run when auth state fundamentally changes (login/logout), not on every re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user?.id]);

    return null; // Side-effect only component
};
