'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '../components/common/Sidebar';
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
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
