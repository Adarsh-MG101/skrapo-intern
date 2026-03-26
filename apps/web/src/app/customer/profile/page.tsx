'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute, Input } from '../../components/common';
import { User, Mail, MapPin, Phone, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function CustomerProfilePage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-[calc(100vh-80px)] mb-20">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10 flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 shadow-sm border border-brand-100 shrink-0">
                <User size={24} strokeWidth={2.5} />
              </div>
              My Profile
            </h1>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
               <ShieldCheck size={120} />
            </div>

            <div className="p-6 sm:p-10 relative z-10">
              <h2 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] mb-8 pb-4 border-b border-gray-100">
                Personal Identity
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
                    label="Default Pickup Address" 
                    value={user?.pickupAddress || 'Not explicitly set'} 
                    readOnly 
                    leftIcon={<MapPin size={18} />}
                    className="bg-gray-50/50 border-gray-100 text-gray-700 pointer-events-none"
                  />
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100">
                 <div className="flex items-center gap-2 text-emerald-500 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <CheckCircle2 size={20} strokeWidth={2.5} />
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-700">Account Verified</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
