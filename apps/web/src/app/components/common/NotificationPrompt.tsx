'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, ShieldCheck, Zap } from 'lucide-react';
import { setupFCM } from '../../../utils/fcm';
import { useAuth } from '../../context/AuthContext';

export const NotificationPrompt = () => {
  const { apiFetch } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Check if permission is already granted or denied
    if (typeof Notification !== 'undefined' && Notification.permission !== 'default') {
      return;
    }

    // Check if user has dismissed it in this session or recently
    const isDismissed = localStorage.getItem('skrapo_notif_prompt_dismissed');
    if (isDismissed) return;

    // Show after a short delay to ensure page is loaded
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    setIsVisible(false);
    if (typeof Notification !== 'undefined') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // If authenticated, we can already try to setup FCM to save token
          // If not, the FCMInitializer will handle it once they log in
          setupFCM(apiFetch);
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Remember dismissal for 24 hours
    localStorage.setItem('skrapo_notif_prompt_dismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm transition-all animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in">
        <div className="relative p-8">
          {/* Background Highlight */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-brand-50 rounded-full opacity-50 blur-3xl" />
          
          <button 
            onClick={handleDismiss}
            className="absolute top-6 right-6 p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 group"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>

          <div className="flex flex-col items-center text-center space-y-6 relative">
            <div className="w-20 h-20 bg-brand-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-brand-500/30 animate-bounce-slow">
              <Bell size={40} className="fill-white" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                Turn on Updates? 🔔
              </h2>
              <p className="text-gray-500 font-medium text-sm leading-relaxed px-4">
                Stay updated on your scrap pickups, assigned champions, and exclusive rewards in real-time.
              </p>
            </div>

            <div className="w-full grid grid-cols-1 gap-4 mt-2">
              <button 
                onClick={handleAllow}
                className="w-full py-4 bg-brand-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-brand-500/20 active:scale-[0.98] transition-all hover:bg-brand-700 flex items-center justify-center gap-2 group"
              >
                Allow Notifications <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={handleDismiss}
                className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-[0.98] transition-all hover:bg-gray-100 hover:text-gray-600"
              >
                May be later
              </button>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 opacity-60">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Safe & Secure</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-60">
                <Zap size={14} className="text-brand-500" />
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Instant Updates</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Internal icon for ArrowRight if not imported from lucide
const ArrowRight = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);
