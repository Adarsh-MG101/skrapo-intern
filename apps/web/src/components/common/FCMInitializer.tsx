'use client';

import { useEffect } from 'react';
import { useAuth } from '../../app/context/AuthContext';
import { setupFCM, onMessageListener } from '../../utils/fcm';
import { useToast } from '../../app/components/common/Toast';

export const FCMInitializer = () => {
    const { isAuthenticated, apiFetch, user } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        if (!isAuthenticated) return;

        // Register for FCM
        setupFCM(apiFetch).then(token => {
            if (token) {
                console.log('✅ FCM Ready for user:', user?.id);
            }
        });

        // Background / Foreground listener for interactive toasts
        const unsubscribe = onMessageListener((payload: any) => {
            console.log('Foreground Push Message:', payload);
            if (payload.notification) {
                showToast(
                    `${payload.notification.title}: ${payload.notification.body}`,
                    'info',
                    true
                );
            }
        });

        return () => unsubscribe();

    }, [isAuthenticated, apiFetch, user, showToast]);

    return null; // Side-effect only component
};
