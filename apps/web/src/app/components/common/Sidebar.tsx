'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useSocket } from '../../context/SocketContext';
import { 
  LayoutDashboard, 
  CalendarPlus, 
  ClipboardList, 
  CreditCard, 
  LifeBuoy, 
  Zap, 
  Users, 
  History, 
  MessageSquare, 
  Settings, 
  TrendingUp, 
  Truck, 
  User,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

const NAV_CONFIG = {
  customer: [
    { name: 'Dashboard', href: '/customer', icon: <LayoutDashboard size={20} strokeWidth={2.5} /> },
    { name: 'Schedule Pickup', href: '/customer/schedule', icon: <CalendarPlus size={20} strokeWidth={2.5} /> },
    { name: 'My Pickups', href: '/customer/pickups', icon: <ClipboardList size={20} strokeWidth={2.5} /> },
    { name: 'Payments', href: '/customer/payments', disabled: true, icon: <CreditCard size={20} strokeWidth={2.5} /> },
    { name: 'Support', href: '/customer/support', disabled: true, icon: <LifeBuoy size={20} strokeWidth={2.5} /> },
  ],
  admin: [
    { name: 'Admin Dashboard', href: '/admin', icon: <LayoutDashboard size={20} strokeWidth={2.5} /> },
    { name: 'Allocation Center', href: '/admin/orders', icon: <Zap size={20} strokeWidth={2.5} /> },
    { name: 'Manage Champs', href: '/admin/champs', icon: <Users size={20} strokeWidth={2.5} /> },
    { name: 'Order History', href: '/admin/history', icon: <History size={20} strokeWidth={2.5} /> },
    { name: 'Feedback Reports', href: '/admin/feedback', icon: <MessageSquare size={20} strokeWidth={2.5} /> },
    { name: 'Settings', href: '/admin/settings', disabled: true, icon: <Settings size={20} strokeWidth={2.5} /> },
  ],
  scrapChamp: [
    { name: 'Dashboard', href: '/scrap-champ', icon: <TrendingUp size={20} strokeWidth={2.5} /> },
    { name: 'Active Jobs', href: '/scrap-champ/jobs', icon: <Truck size={20} strokeWidth={2.5} /> },
    { name: 'Job History', href: '/scrap-champ/history', icon: <History size={20} strokeWidth={2.5} /> },
    { name: 'My Profile/Earnings', href: '/scrap-champ/profile', disabled: true, icon: <User size={20} strokeWidth={2.5} /> },
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
       <Menu size={24} />
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
  const [showLogoutPrompt, setShowLogoutPrompt] = useState(false);

  // Get current nav items based on role, default to empty
  const currentNavItems = user?.role ? (NAV_CONFIG as any)[user.role] || [] : [];

  useEffect(() => {
    if (onCollapse) {
      onCollapse(isCollapsed);
    }
  }, [isCollapsed, onCollapse]);

  // Wrap loadCounts in useCallback to use it in useEffect
  const loadCounts = React.useCallback(async () => {
    if (!user || !apiFetch) return;
    try {
      if (user.role === 'admin' && pathname !== '/admin/orders') {
        const res = await apiFetch('/orders/admin/stats');
        if (res.ok) {
          const data = await res.json();
          // Current live count is Requested states only
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
  }, [user, apiFetch, pathname]);

  useEffect(() => {
    if (!socket) return;
    
    // Sync with server on ANY relevant change instead of manual math
    const handleSync = () => loadCounts();

    socket.on('new_pickup_request', handleSync);
    socket.on('pickup_cancelled', handleSync);
    socket.on('broadcast_exhausted', handleSync);
    socket.on('broadcast_failed', handleSync);
    socket.on('order_accepted', handleSync);
    socket.on('order_completed', handleSync);
    socket.on('new_job_assigned', handleSync);
    socket.on('new_available_job', handleSync);

    return () => {
      socket.off('new_pickup_request', handleSync);
      socket.off('pickup_cancelled', handleSync);
      socket.off('broadcast_exhausted', handleSync);
      socket.off('broadcast_failed', handleSync);
      socket.off('order_accepted', handleSync);
      socket.off('order_completed', handleSync);
      socket.off('new_job_assigned', handleSync);
      socket.off('new_available_job', handleSync);
    };
  }, [socket, loadCounts]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    const handleOpen = () => setIsMobileOpen(true);
    window.addEventListener('open-mobile-sidebar', handleOpen);
    return () => window.removeEventListener('open-mobile-sidebar', handleOpen);
  }, []);

  useEffect(() => {
    if (pathname === '/admin/orders') setAdminOrderCount(0);
    if (pathname === '/scrap-champ/jobs') setChampJobCount(0);
  }, [pathname]);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const handleLogout = () => {
    setShowLogoutPrompt(true);
  };

  const confirmLogout = () => {
    logout();
    router.replace('/login');
  };

  const cancelLogout = () => {
    setShowLogoutPrompt(false);
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
          <div className={`px-6 pt-10 pb-6 flex items-start mb-2 relative ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {/* Mobile Close Button */}
            <button 
              onClick={() => setIsMobileOpen(false)} 
              className="lg:hidden absolute top-2 right-6 p-2 rounded-xl bg-gray-50 text-gray-900 hover:bg-gray-100 hover:text-brand-600 transition-all active:scale-95 shadow-sm border border-gray-100 z-10"
            >
              <Menu size={20} />
            </button>

            <div className={`flex items-center transition-all duration-500 ${isCollapsed ? 'opacity-0 scale-50 w-0 pointer-events-none overflow-hidden' : 'opacity-100 scale-100'}`}>
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mr-3 shadow-md rotate-1 flex-shrink-0 transition-transform hover:rotate-6 overflow-hidden border border-gray-100 shadow-brand-500/10">
                <img src="/skrapo-logo.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col whitespace-nowrap justify-center">
                <span className="text-2xl font-black text-gray-900 tracking-tighter leading-none">Recycle My Bin</span>
              </div>
            </div>

            {/* Collapse Toggle */}
            <button
              onClick={toggleSidebar}
              className={`p-2.5 -mt-1 rounded-xl text-gray-400 hover:bg-brand-50 hover:text-brand-600 transition-all active:scale-95 hidden lg:block
                ${isCollapsed ? 'bg-gray-50 shadow-inner' : ''}
              `}
            >
              {isCollapsed ? <ChevronsRight size={22} /> : <ChevronsLeft size={22} />}
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
                    className={`flex items-center py-4 px-4 rounded-2xl transition-all duration-300 group relative cursor-pointer
                      ${isCollapsed ? 'justify-center' : 'justify-start'}
                      text-slate-900 font-bold hover:bg-gray-900 hover:text-white hover:shadow-xl hover:shadow-gray-900/10 active:scale-95`}
                    title="Coming Soon"
                    onClick={() => window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `${item.name} is coming soon!`, type: 'info' }}))}
                  >
                    <div className="transition-all duration-300 text-slate-700 group-hover:text-white group-hover:scale-110">
                      {item.icon}
                    </div>
                    {!isCollapsed && (
                      <span className="ml-4 tracking-tight flex items-center flex-1 justify-between">
                        <span>{item.name}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] uppercase tracking-widest font-black rounded-lg group-hover:bg-white/20 group-hover:text-white/60 transition-colors">
                          Soon
                        </span>
                      </span>
                    )}
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 z-[70] shadow-xl whitespace-nowrap">
                        {item.name} <span className="text-gray-400 ml-1">(Coming Soon)</span>
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
                  className={`flex items-center py-4 px-4 rounded-2xl transition-all duration-500 group relative active:scale-95
                    ${isActive 
                      ? 'bg-gray-900 text-white font-black shadow-2xl shadow-gray-900/30 ring-1 ring-white/10' 
                      : 'text-slate-900 font-bold hover:bg-gray-900 hover:text-white hover:shadow-xl hover:shadow-gray-900/10'}
                    ${isCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                  title={item.name}
                >
                  <div className={`transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-brand-400' : 'text-slate-700 group-hover:text-white'}`}>
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
                  <LogOut size={16} className="mr-2 transition-transform group-hover:-translate-x-1" />
                  Sign Out
                </button>
              )}

              {isCollapsed && (
                <button
                   onClick={handleLogout}
                   className="mt-4 p-2.5 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center mx-auto"
                   title="Sign Out"
                >
                   <LogOut size={20} />
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
        @keyframes zoom-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-grow-y {
          animation: grow-y 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform-origin: center;
        }
        .animate-zoom-in {
          animation: zoom-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* Logout Confirmation Modal */}
      {showLogoutPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white rounded-[32px] shadow-2xl max-w-sm w-full p-8 animate-zoom-in border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner">
              <LogOut size={40} strokeWidth={2.5} />
            </div>
            
            <h3 className="text-2xl font-black text-gray-900 text-center mb-2 tracking-tight">
              Sign Out?
            </h3>
            <p className="text-gray-500 text-center mb-8 leading-relaxed font-medium">
              Are you sure you want to sign out of your account? You will need to log in again to access your dashboard.
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmLogout}
                className="w-full py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/25 active:scale-95 flex items-center justify-center gap-2"
              >
                <LogOut size={20} strokeWidth={3} />
                Yes, Sign Out
              </button>
              <button
                onClick={cancelLogout}
                className="w-full py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all active:scale-95 text-sm uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
