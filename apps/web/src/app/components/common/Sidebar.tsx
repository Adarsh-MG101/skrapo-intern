'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useSocket } from '../../context/SocketContext';

interface SidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

const NAV_CONFIG = {
  customer: [
    { name: 'Dashboard', href: '/customer', icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ) },
    { name: 'Schedule Pickup', href: '/customer/schedule', icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ) },
    { name: 'My Pickups', href: '/customer/pickups', icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ) },
    { name: 'Payments', href: '/customer/payments', disabled: true, icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ) },
    { name: 'Support', href: '/customer/support', disabled: true, icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ) },
  ],
  admin: [
    { name: 'Admin Dashboard', href: '/admin', icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16M11 6l2 2m-2 2l2-2m-5 8l2 2m-2 2l2-2" />
      </svg>
    ) },
    { name: 'Allocation Center', href: '/admin/orders', icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ) },
    { name: 'Manage Champs', href: '/admin/champs', icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ) },
    { name: 'Order History', href: '/admin/history', icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) },
    { name: 'Feedback Reports', href: '/admin/feedback', icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ) },
    { name: 'Settings', href: '/admin/settings', disabled: true, icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ) },
  ],
  scrapChamp: [
    { name: 'Dashboard', href: '/scrap-champ', icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ) },
    { name: 'Active Jobs', href: '/scrap-champ/jobs', icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ) },
    { name: 'Job History', href: '/scrap-champ/history', icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) },
    { name: 'My Profile/Earnings', href: '/scrap-champ/profile', disabled: true, icon: (
      <svg className="w-5 h-5 transition-colors group-hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ) },
  ],
};

export function SidebarTrigger({ className = "" }: { className?: string }) {
  const open = () => window.dispatchEvent(new CustomEvent('open-mobile-sidebar'));
  return (
    <button 
      onClick={open} 
      className={`lg:hidden p-3 rounded-2xl bg-white shadow-xl shadow-brand-500/10 border border-gray-100 text-gray-600 hover:text-brand-600 transition-all active:scale-90 ${className}`}
      aria-label="Open Sidebar"
    >
       <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
       </svg>
    </button>
  );
}
export default function Sidebar({ onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, apiFetch } = useAuth();
  const { socket } = useSocket();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [adminOrderCount, setAdminOrderCount] = useState(0);
  const [champJobCount, setChampJobCount] = useState(0);

  // Get current nav items based on role, default to empty
  const currentNavItems = user?.role ? (NAV_CONFIG as any)[user.role] || [] : [];

  useEffect(() => {
    if (onCollapse) {
      onCollapse(isCollapsed);
    }
  }, [isCollapsed, onCollapse]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewPickup = () => {
      if (pathname !== '/admin/orders') setAdminOrderCount(prev => prev + 1);
    };
    
    const handleNewJob = () => {
      if (pathname !== '/scrap-champ/jobs') setChampJobCount(prev => prev + 1);
    };

    socket.on('new_pickup_request', handleNewPickup);
    socket.on('new_job_assigned', handleNewJob);
    socket.on('new_available_job', handleNewJob);

    return () => {
      socket.off('new_pickup_request', handleNewPickup);
      socket.off('new_job_assigned', handleNewJob);
      socket.off('new_available_job', handleNewJob);
    };
  }, [socket, pathname]);

  useEffect(() => {
    const handleOpen = () => setIsMobileOpen(true);
    window.addEventListener('open-mobile-sidebar', handleOpen);
    return () => window.removeEventListener('open-mobile-sidebar', handleOpen);
  }, []);

  // Initial load logic for fetching actual unread numbers
  useEffect(() => {
    if (!user || !apiFetch) return;

    const loadCounts = async () => {
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
        }
      } catch (err) {
        console.error('Failed to load notification counts', err);
      }
    };
    
    loadCounts();
  }, [user, apiFetch, pathname]);

  useEffect(() => {
    if (pathname === '/admin/orders') setAdminOrderCount(0);
    if (pathname === '/scrap-champ/jobs') setChampJobCount(0);
  }, [pathname]);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <>


      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[60] animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-100 z-[65] transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
          ${isCollapsed ? 'w-20' : 'w-[280px]'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Brand/Header */}
          <div className={`px-6 pt-10 pb-6 flex items-start mb-2 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex items-center transition-all duration-500 ${isCollapsed ? 'opacity-0 scale-50 w-0 pointer-events-none overflow-hidden' : 'opacity-100 scale-100'}`}>
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mr-3 shadow-md rotate-1 flex-shrink-0 transition-transform hover:rotate-6 overflow-hidden border border-gray-100">
                <img src="/skrapo-logo.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col whitespace-nowrap justify-center">
                <span className="text-2xl font-black text-gray-900 tracking-tighter leading-none">Skrapo</span>
              </div>
            </div>

            {/* Collapse Toggle */}
            <button
              onClick={toggleSidebar}
              className={`p-2.5 -mt-1 rounded-xl text-gray-400 hover:bg-brand-50 hover:text-brand-600 transition-all active:scale-95 hidden lg:block
                ${isCollapsed ? 'bg-gray-50 shadow-inner' : ''}
              `}
            >
              <svg 
                className={`w-6 h-6 transition-transform duration-500 ${isCollapsed ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            
            {/* Mobile Close Button */}
            <button onClick={() => setIsMobileOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 mb-4">
             <div className={`h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent w-full ${isCollapsed ? 'hidden' : 'block'}`} />
          </div>

          {/* Nav List */}
          <nav className={`flex-1 px-6 space-y-2 ${isCollapsed ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
            {currentNavItems.map((item: any) => {
              const isBaseRoute = item.href === '/customer' || item.href === '/admin' || item.href === '/scrap-champ';
              const isActive = isBaseRoute 
                ? pathname === item.href 
                : pathname.startsWith(item.href);
              if (item.disabled) {
                return (
                  <div
                    key={item.href}
                    className={`flex items-center py-4 px-4 rounded-2xl transition-all duration-300 group relative opacity-40 cursor-not-allowed grayscale text-gray-400 ${isCollapsed ? 'justify-center' : 'justify-start'}`}
                    title="Coming Soon"
                  >
                    <div className="transition-all duration-300 text-gray-400">
                      {item.icon}
                    </div>
                    {!isCollapsed && (
                      <span className="ml-4 tracking-tight flex items-center">
                        {item.name}
                        <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-500 text-[9px] uppercase tracking-widest font-black rounded-lg">
                          Soon
                        </span>
                      </span>
                    )}
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 z-[70] shadow-xl whitespace-nowrap">
                        {item.name} <span className="text-gray-400 ml-1">(Soon)</span>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center py-4 px-4 rounded-2xl transition-all duration-300 group relative
                    ${isActive 
                      ? 'bg-brand-50 text-brand-700 font-bold shadow-sm shadow-brand-500/5' 
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}
                    ${isCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                  title={item.name}
                >
                  <div className={`transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                    {item.icon}
                  </div>
                  {!isCollapsed && (
                    <span className="ml-4 tracking-tight flex items-center justify-between flex-1">
                      <span>{item.name}</span>
                      {item.href === '/admin/orders' && adminOrderCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs font-black min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 animate-bounce shadow-md">
                          {adminOrderCount}
                        </span>
                      )}
                      {item.href === '/scrap-champ/jobs' && champJobCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs font-black min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 animate-bounce shadow-md">
                          {champJobCount}
                        </span>
                      )}
                    </span>
                  )}
                  {isActive && !isCollapsed && (
                    <div className="absolute left-0 w-1.5 h-6 bg-brand-500 rounded-r-full animate-grow-y" />
                  )}
                  {isCollapsed && (
                    <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 z-[70] shadow-xl whitespace-nowrap">
                      {item.name}
                      {item.href === '/admin/orders' && adminOrderCount > 0 && ` (${adminOrderCount})`}
                      {item.href === '/scrap-champ/jobs' && champJobCount > 0 && ` (${champJobCount})`}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Footer */}
          <div className="p-6 mt-auto">
            <div className={`bg-gray-50 rounded-2xl transition-all duration-300 ${isCollapsed ? 'p-1 bg-transparent' : 'p-4'}`}>
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-4'}`}>
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 font-black shadow-sm ring-2 ring-white flex-shrink-0">
                  {user?.name?.[0].toUpperCase() || 'U'}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-bold text-gray-900 truncate tracking-tight">{user?.name || 'User'}</p>
                    <p className="text-[10px] font-bold uppercase text-brand-600 tracking-wider">
                      {user?.role === 'scrapChamp' ? 'Champion' : user?.role || 'User'}
                    </p>
                  </div>
                )}
              </div>
              
              {!isCollapsed && (
                <button
                  onClick={handleLogout}
                  className="mt-4 flex items-center justify-center py-3 px-4 w-full rounded-xl text-red-500 hover:bg-red-100 hover:text-red-700 transition-all font-bold text-xs uppercase tracking-widest group"
                >
                  <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              )}

              {isCollapsed && (
                <button
                   onClick={handleLogout}
                   className="mt-4 p-2.5 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center mx-auto"
                >
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                   </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes grow-y {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-grow-y {
          animation: grow-y 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform-origin: center;
        }
      `}</style>
    </>
  );
}
