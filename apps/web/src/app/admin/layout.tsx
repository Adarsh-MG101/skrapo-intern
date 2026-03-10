'use client';

import React, { useEffect, useState } from 'react';
import Sidebar, { SidebarTrigger } from '../components/common/Sidebar';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/common/Toast';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { socket } = useSocket();
  const { showToast } = useToast();

  useEffect(() => {
    if (!socket) return;

    socket.on('admin_no_acceptance', (data: any) => {
      console.warn('⚠️ [Admin Alert] No acceptance for order:', data.orderId);
      showToast(data.message || 'Warning: An order has not been accepted within 30 minutes!', 'error');
    });

    return () => {
      socket.off('admin_no_acceptance');
    };
  }, [socket, showToast]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar onCollapse={setIsSidebarCollapsed} />
      
      <main 
        className={`flex-1 transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-[280px]'}
        `}
      >
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-[50]">
          <SidebarTrigger className="!shadow-none !border-none !p-2" />
          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center ml-2 shadow-sm border border-gray-100 overflow-hidden">
            <img src="/skrapo-logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tight ml-2">Recycle My Bin</span>
        </div>

        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
