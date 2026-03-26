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

        // Force permission request via a native browser confirm (valid user gesture for mobile)
        const triggerPermission = async () => {
            if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                const wantsNotifs = window.confirm("Allow Skrapo to send you real-time updates on your pickups?");
                if (wantsNotifs) {
                     await Notification.requestPermission();
                }
            }
        };

        triggerPermission().then(() => {
            setupFCM(apiFetch).then(token => {
                if (token) {
                    console.log('✅ FCM Ready for user:', user.id);
                } else {
                    fcmInitialized.current = false;
                }
            }).catch(() => {
                fcmInitialized.current = false;
            });
        });

        // Foreground listener — shows in-app toast when push arrives while app is open.
        const unsubscribe = onMessageListener((payload: any) => {
            console.log('[FCM] Foreground message:', payload);
            
            const title = payload.notification?.title || payload.data?.title;
            const body = payload.notification?.body || payload.data?.body;
            const targetUserId = payload.data?.targetUserId;
            
            // Security/Privacy Filter: Only show toast if intended for this specific user
            // Note: user.id comes from useAuth
            if (targetUserId && targetUserId !== user.id) {
                console.log(`[FCM] Ignoring notification intended for another user (${targetUserId})`);
                return;
            }
            
            if (title && body) {
                // Create a simple dedup key from title + body
                const notifId = `${title}:${body}`;
                if (notifId === lastNotificationId.current) {
                    console.log('[FCM] Skipping duplicate foreground notification');
                    return;
                }
                lastNotificationId.current = notifId;
                
                // Clear the dedup key after 5 seconds
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
