'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Info, CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'Info' | 'Success' | 'Warning' | 'Error' | string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

const formatDistanceToNowCustom = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

const NotificationBell = () => {
  const { apiFetch, user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fallback setup on first interaction to bypass "user gesture" restrictions on some browsers
  const handleBellClick = () => {
    setIsOpen(!isOpen);
    
    // Attempt registration on click if not already successful
    if (!localStorage.getItem('fcm_registered')) {
      import('../../../utils/fcm').then(({ setupFCM }) => {
        setupFCM(apiFetch).then((token: string | null) => {
          if (token) localStorage.setItem('fcm_registered', 'true');
        });
      });
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch('/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, apiFetch]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    };

    socket.on('notification', handleNewNotification);
    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const res = await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => n._id === id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await apiFetch('/notifications/read-all', { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const res = await apiFetch('/notifications/clear-all', { method: 'DELETE' });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Success': return <CheckCircle className="text-emerald-500" size={16} />;
      case 'Warning': return <AlertTriangle className="text-amber-500" size={16} />;
      case 'Error': return <AlertCircle className="text-red-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleBellClick}
        className="p-2 mr-2 rounded-xl hover:bg-gray-100 transition-colors relative group"
        aria-label="Notifications"
      >
        <Bell size={22} className="text-gray-600 group-hover:text-brand-600 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white text-[9px] md:text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Mobile backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/20 z-[99] md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-x-0 top-[56px] bottom-[80px] z-[100] md:absolute md:inset-auto md:right-0 md:top-auto md:bottom-auto md:mt-3 md:w-96 bg-white md:rounded-3xl md:shadow-2xl md:border md:border-gray-100 overflow-hidden flex flex-col md:max-h-[80vh]">
            <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">Notifications</h3>
                <div className="flex gap-3 ml-2 border-l border-gray-200 pl-3">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[9px] font-black text-brand-600 uppercase tracking-widest hover:text-brand-700 underline underline-offset-2"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button 
                      onClick={clearAllNotifications}
                      className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:text-red-700 underline underline-offset-2"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mb-4 border border-gray-100">
                     <Bell size={24} strokeWidth={1.5} />
                  </div>
                  <p className="text-gray-900 font-bold mb-1">Stay Tuned!</p>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">When you get updates about your orders, they'll show up here.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notification, index) => (
                    <div 
                      key={notification._id || index}
                      className={`block p-4 transition-colors hover:bg-gray-50 relative group cursor-pointer ${!notification.isRead ? 'bg-brand-50/10' : ''}`}
                      onClick={() => !notification.isRead && markAsRead(notification._id)}
                    >
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border bg-white ${!notification.isRead ? 'border-brand-100 shadow-sm' : 'border-gray-50'}`}>
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                             <p className={`text-xs font-black text-gray-900 truncate pr-4 ${!notification.isRead ? 'text-brand-700' : ''}`}>
                               {notification.title}
                             </p>
                             {!notification.isRead && (
                               <div className="w-1.5 h-1.5 bg-brand-500 rounded-full flex-shrink-0 animate-pulse mt-1.5" />
                             )}
                          </div>
                          <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-1.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none flex items-center gap-2">
                             <span>{new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                             <span className="text-gray-300">&bull;</span>
                             <span>{formatDistanceToNowCustom(notification.createdAt)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-3 bg-gray-50/30 border-t border-gray-100 text-center flex-shrink-0">
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest opacity-50">End of Feed</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
