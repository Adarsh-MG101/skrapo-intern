'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from './index';
import { UserCircle } from 'lucide-react';

const Header = () => {
  const { user } = useAuth();

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-[50]">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 overflow-hidden">
          <img src="/skrapo-logo.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <span className="text-xl font-black text-gray-900 tracking-tight ml-2">Recyclemybin</span>
      </div>
      
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2 pr-3 border-r border-gray-100">
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-[10px] font-black text-gray-900 leading-none truncate max-w-[120px] uppercase tracking-tighter">
                {user.name}
              </span>
              <span className="text-[8px] font-bold text-brand-600 uppercase tracking-widest mt-1">
                {user.role === 'scrap-champ' ? 'Scrap Champ' : user.role}
              </span>
            </div>
            <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shadow-sm border border-brand-100 shrink-0">
               <UserCircle size={18} strokeWidth={2.5} />
            </div>
          </div>
        )}
        
        <NotificationBell />
      </div>
    </div>
  );
};

export default Header;
