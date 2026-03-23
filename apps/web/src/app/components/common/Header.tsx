'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from './index';
import { UserCircle, ChevronDown, LogOut } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
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
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-[50]">
      <div className="flex items-center gap-2">
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

            {/* Floating User Identity Popover */}
            {showUserMenu && (
              <div 
                className="absolute right-[-10px] sm:right-0 mt-4 w-44 bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-brand-100/30 p-5 animate-float-in z-50 text-center"
              >
                {/* Visual Arrow */}
                <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white border-t border-l border-brand-100/30 rotate-45" />
                
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mx-auto mb-3 shadow-sm border border-brand-100/50">
                    <UserCircle size={24} strokeWidth={2.5} />
                </div>
                
                <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] mb-1">Identity</p>
                <p className="text-xs font-black text-gray-900 uppercase tracking-tight truncate mb-1">{user.name}</p>
                <div className="inline-block px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                    {user.role === 'scrapChamp' ? 'Scrap Champ' : user.role === 'admin' ? 'Administrator' : 'Customer'}
                    </p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full py-2.5 flex items-center justify-center gap-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"
                  >
                    <LogOut size={16} strokeWidth={2.5} /> Sign Out
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
