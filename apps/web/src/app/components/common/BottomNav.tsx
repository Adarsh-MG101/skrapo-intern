'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  LayoutDashboard,
  CalendarPlus,
  ClipboardList,
  Zap,
  Users,
  History,
  TrendingUp,
  Truck,
  User,
  MessageSquare,
} from 'lucide-react';

const NAV_CONFIG = {
  customer: [
    { name: 'Home', href: '/customer', icon: LayoutDashboard },
    { name: 'Schedule', href: '/customer/schedule', icon: CalendarPlus },
    { name: 'Pickups', href: '/customer/pickups', icon: ClipboardList },
    { name: 'Profile', href: '/customer/profile', icon: User },
  ],
  admin: [
    { name: 'Home', href: '/admin', icon: LayoutDashboard },
    { name: 'Queue', href: '/admin/orders', icon: Zap },
    { name: 'Feed', href: '/admin/feedback', icon: MessageSquare },
    { name: 'Champs', href: '/admin/champs', icon: Users },
    { name: 'Logs', href: '/admin/history', icon: History },
    { name: 'Profile', href: '/admin/profile', icon: User },
  ],
  scrapChamp: [
    { name: 'Dashboard', href: '/scrap-champ', icon: TrendingUp },
    { name: 'Jobs', href: '/scrap-champ/jobs', icon: Truck },
    { name: 'History', href: '/scrap-champ/history', icon: History },
    { name: 'Profile', href: '/scrap-champ/profile', icon: User },
  ],
};

export default function BottomNav() {
  const pathname = usePathname();
  const { user, apiFetch } = useAuth();
  const { socket } = useSocket();

  const [adminOrderCount, setAdminOrderCount] = useState(0);
  const [champJobCount, setChampJobCount] = useState(0);
  const [customerNotiCount, setCustomerNotiCount] = useState(0);

  const currentNavItems = user?.role ? (NAV_CONFIG as any)[user.role] || [] : [];

  const loadCounts = useCallback(async () => {
    if (!user || !apiFetch) return;
    try {
      if (user.role === 'admin' && pathname !== '/admin/orders') {
        const res = await apiFetch('/orders/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setAdminOrderCount(data.pending || 0);
        }
      } else if (user.role === 'scrapChamp' && pathname !== '/scrap-champ/jobs') {
        const res = await apiFetch('/orders/scrap-champ/stats');
        if (res.ok) {
          const data = await res.json();
          setChampJobCount(data.total || 0);
        }
      } else if (user.role === 'customer' && pathname !== '/customer/pickups') {
        const res = await apiFetch('/notifications');
        if (res.ok) {
          const data = await res.json();
          const unread = data.filter((n: any) => !n.isRead).length;
          setCustomerNotiCount(unread);
        }
      }
    } catch (err) {
      console.error('Failed to load notification counts', err);
    }
  }, [user, apiFetch, pathname]);

  useEffect(() => {
    if (!socket) return;

    const handleSync = () => loadCounts();

    socket.on('new_pickup_request', handleSync);
    socket.on('pickup_cancelled', handleSync);
    socket.on('broadcast_exhausted', handleSync);
    socket.on('broadcast_failed', handleSync);
    socket.on('order_accepted', handleSync);
    socket.on('order_completed', handleSync);
    socket.on('new_job_assigned', handleSync);
    socket.on('new_available_job', handleSync);
    socket.on('notification', handleSync);
    socket.on('order_accepted_customer', handleSync);
    socket.on('order_completed_customer', handleSync);
    socket.on('order_status_update', handleSync);

    return () => {
      socket.off('new_pickup_request', handleSync);
      socket.off('pickup_cancelled', handleSync);
      socket.off('broadcast_exhausted', handleSync);
      socket.off('broadcast_failed', handleSync);
      socket.off('order_accepted', handleSync);
      socket.off('order_completed', handleSync);
      socket.off('new_job_assigned', handleSync);
      socket.off('new_available_job', handleSync);
      socket.off('notification', handleSync);
      socket.off('order_accepted_customer', handleSync);
      socket.off('order_completed_customer', handleSync);
      socket.off('order_status_update', handleSync);
    };
  }, [socket, loadCounts]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    if (pathname === '/admin/orders') setAdminOrderCount(0);
    if (pathname === '/scrap-champ/jobs') setChampJobCount(0);
    if (pathname === '/customer/pickups') {
      // Mark as read or just clear UI count
      setCustomerNotiCount(0);
    }
  }, [pathname]);

  // Build nav items:
  // For admin, we have 5 items + we keep them as is (Settings is removed since disabled) and add logout
  // Actually, let's keep it simple: show all non-disabled items + a logout item
  // But we need to keep the count manageable for bottom nav (max ~5 items)

  const getBadge = (href: string): number => {
    if (href === '/admin/orders') return adminOrderCount;
    if (href === '/scrap-champ/jobs') return champJobCount;
    if (href === '/customer/pickups') return customerNotiCount;
    return 0;
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="btm-nav lg:hidden">
        <div className="btm-nav-inner">
          {currentNavItems.map((item: any) => {
            const isBaseRoute =
              item.href === '/customer' ||
              item.href === '/admin' ||
              item.href === '/scrap-champ';
            const isActive = isBaseRoute
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const badge = getBadge(item.href);
            const Icon = item.icon;

            if (item.disabled) {
              return (
                <button
                  key={item.href}
                  className={`btm-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('show-toast', {
                        detail: {
                          message: `${item.name} is coming soon!`,
                          type: 'info',
                        },
                      })
                    )
                  }
                >
                  <div className="btm-nav-icon-wrap">
                    <Icon size={22} strokeWidth={2} />
                    <span className="btm-nav-soon">Soon</span>
                  </div>
                  <span className="btm-nav-label">{item.name}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`btm-nav-item ${isActive ? 'active' : ''}`}
              >
                <div className="btm-nav-icon-wrap">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {badge > 0 && <span className="btm-nav-badge">{badge}</span>}
                </div>
                <span className="btm-nav-label">{item.name}</span>
                {isActive && <div className="btm-nav-indicator" />}
              </Link>
            );
          })}
        </div>
      </nav>

      <style jsx global>{`
        /* Bottom Navigation Bar */
        .btm-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 90;
          background: #ffffff;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.06);
        }

        .btm-nav-inner {
          display: flex;
          align-items: stretch;
          justify-content: space-around;
          max-width: 600px;
          margin: 0 auto;
          padding: 6px 4px 4px;
        }

        .btm-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          padding: 6px 2px 8px;
          border-radius: 16px;
          color: #94a3b8;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          border: none;
          background: none;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          min-width: 0;
        }

        .btm-nav-item:active {
          transform: scale(0.92);
        }

        .btm-nav-item.active {
          color: #111827;
        }

        .btm-nav-item.active .btm-nav-icon-wrap {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          box-shadow: 0 2px 12px rgba(34, 197, 94, 0.15);
        }

        .btm-nav-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 32px;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 2px;
        }

        .btm-nav-item.active .btm-nav-icon-wrap svg {
          color: #16a34a;
        }

        .btm-nav-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.02em;
          line-height: 1;
          transition: color 0.3s;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 64px;
          text-align: center;
        }

        .btm-nav-item.active .btm-nav-label {
          color: #111827;
          font-weight: 800;
        }

        .btm-nav-indicator {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 3px;
          background: linear-gradient(90deg, #22c55e, #16a34a);
          border-radius: 0 0 4px 4px;
          animation: indicator-appear 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .btm-nav-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 18px;
          height: 18px;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 900;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
          animation: badge-pulse 2s infinite;
        }

        .btm-nav-soon {
          position: absolute;
          top: -3px;
          right: -6px;
          font-size: 7px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #9ca3af;
          background: #f3f4f6;
          padding: 1px 4px;
          border-radius: 4px;
          line-height: 1.2;
        }

        .btm-nav-logout {
          color: #f87171 !important;
        }
        .btm-nav-logout:active {
          color: #dc2626 !important;
        }
        .btm-nav-logout .btm-nav-label {
          color: #f87171;
        }

        @keyframes indicator-appear {
          from {
            width: 0;
            opacity: 0;
          }
          to {
            width: 20px;
            opacity: 1;
          }
        }

        @keyframes badge-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-zoom-in {
          animation: zoom-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </>
  );
}
