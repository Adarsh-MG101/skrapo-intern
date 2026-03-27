'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from './index';
import { UserCircle, ChevronDown, LogOut, User, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const Header = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between lg:justify-end px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-[50]">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 overflow-hidden">
          <img src="/skrapo-logo.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <span className="text-2xl font-black text-gray-900 tracking-tight">Recyclemybin</span>
      </div>
      
      <div className="flex items-center gap-3">
        {user && (
          <div className="relative" ref={menuRef}>
            <div 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`
                flex items-center gap-2 pr-2 md:pr-3 cursor-pointer group transition-all duration-300 rounded-2xl p-1.5
                ${showUserMenu ? 'bg-gray-50 ring-2 ring-gray-100' : 'hover:bg-gray-50'}
              `}
            >
              <div className="hidden sm:flex flex-col items-end mr-1">
                <span className="text-[10px] font-black text-gray-900 leading-none truncate max-w-[120px] uppercase tracking-tighter">
                  {user.name}
                </span>
                <span className="text-[8px] font-bold text-brand-600 uppercase tracking-widest mt-1">
                  {user.role === 'scrapChamp' ? 'Scrap Champ' : user.role === 'admin' ? 'Administrator' : 'Customer'}
                </span>
              </div>
              <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shadow-sm border border-brand-100 shrink-0 group-hover:scale-105 transition-transform">
                 <UserCircle size={18} strokeWidth={2.5} />
              </div>
              <ChevronDown size={14} className={`text-gray-300 transition-transform hidden sm:block ${showUserMenu ? 'rotate-180 text-brand-500' : ''}`} />
            </div>

            {/* Premium Floating User Profile Identity Popover */}
            {showUserMenu && (
              <div 
                className="absolute right-[-10px] sm:right-0 mt-4 w-60 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.18)] border border-gray-100 p-2 animate-float-in z-50 rounded-[2rem] overflow-hidden"
              >
                {/* Visual Identity Section */}
                <div className="bg-gray-50/50 p-6 rounded-[1.8rem] mb-2 flex flex-col items-center text-center">
                   <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-brand-600 mb-4 shadow-sm border border-brand-50 relative group">
                      <UserCircle size={28} strokeWidth={2.5} />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" title="Online" />
                   </div>
                   
                   <p className="text-sm font-black text-gray-900 uppercase tracking-tight truncate max-w-full leading-none mb-1">{user.name}</p>
                   <p className="text-[10px] font-bold text-gray-400 lowercase italic opacity-80">{user.email || user.mobileNumber}</p>
                </div>

                {/* Account Navigation List */}
                <div className="space-y-1 p-1">
                   <button
                     onClick={() => {
                       const path = user.role === 'scrapChamp' ? '/scrap-champ/profile' : `/${user.role}/profile`;
                       router.push(path);
                       setShowUserMenu(false);
                     }}
                     className="w-full h-11 px-6 rounded-xl flex items-center justify-center gap-2.5 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition-all group relative"
                   >
                     <User size={16} strokeWidth={2.5} />
                     <span className="text-[11px] font-black uppercase tracking-widest">My Account</span>
                     <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 absolute right-6 -translate-x-2 group-hover:translate-x-0 transition-all" />
                   </button>
                   
                   <div className="mx-4 h-px bg-gray-50 my-2" />

                   <button
                     onClick={() => {
                       setShowUserMenu(false);
                       logout();
                     }}
                     className="w-full h-11 px-6 rounded-xl flex items-center justify-center gap-2.5 text-red-400 hover:bg-red-50 hover:text-red-500 transition-all group"
                   >
                     <LogOut size={16} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
                     <span className="text-[11px] font-black uppercase tracking-widest">Sign Out</span>
                   </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        <NotificationBell />
      </div>
    </div>
  );
};

export default Header;
