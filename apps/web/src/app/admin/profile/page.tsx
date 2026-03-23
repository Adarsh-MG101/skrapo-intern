'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute, Button, Input } from '../../components/common';
import { User, Mail, Phone, LogOut, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function AdminProfilePage() {
  const { user, logout } = useAuth();
  const [showLogoutPrompt, setShowLogoutPrompt] = useState(false);

  const confirmLogout = () => {
    logout();
  };

  const cancelLogout = () => {
    setShowLogoutPrompt(false);
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-[calc(100vh-80px)] mb-20">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10 flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 shadow-sm border border-brand-100 shrink-0">
                <User size={24} strokeWidth={2.5} />
              </div>
              Control Profile
            </h1>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
               <ShieldCheck size={120} />
            </div>

            <div className="p-6 sm:p-10 relative z-10">
              <h2 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] mb-8 pb-4 border-b border-gray-100">
                Administrative Identity
              </h2>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input 
                    label="Full Name" 
                    value={user?.name || ''} 
                    readOnly 
                    leftIcon={<User size={18} />}
                    className="bg-gray-50/50 border-gray-100 text-gray-700 pointer-events-none"
                  />
                  <Input 
                    label="Mobile Number" 
                    value={user?.mobileNumber || ''} 
                    readOnly 
                    leftIcon={<Phone size={18} />}
                    className="bg-gray-50/50 border-gray-100 text-gray-700 pointer-events-none"
                  />
                </div>
                
                <Input 
                  label="Email Address" 
                  value={user?.email || ''} 
                  readOnly 
                  leftIcon={<Mail size={18} />}
                  className="bg-gray-50/50 border-gray-100 text-gray-700 pointer-events-none"
                />

                <div className="pt-4">
                  <Input 
                    label="Admin Tier / Division" 
                    value={user?.role === 'admin' ? 'Global Administrator' : user?.role || 'Unknown'} 
                    readOnly 
                    leftIcon={<ShieldCheck size={18} />}
                    className="bg-gray-50/50 border-gray-100 text-gray-700 pointer-events-none"
                  />
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100">
                 <div className="flex items-center gap-2 text-emerald-500 mb-8 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <CheckCircle2 size={20} strokeWidth={2.5} />
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-700">System Access Verified</span>
                 </div>

                 <Button 
                   variant="ghost" 
                   onClick={() => setShowLogoutPrompt(true)}
                   fullWidth
                   className="py-5 rounded-2xl text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 border-2 border-red-100 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
                 >
                   <LogOut size={20} strokeWidth={2.5} /> Terminate Admin Session
                 </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Confirmation Modal */}
        {showLogoutPrompt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
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
                Are you sure you want to end your administrative session? You will be securely logged out.
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
      </div>
    </ProtectedRoute>
  );
}
