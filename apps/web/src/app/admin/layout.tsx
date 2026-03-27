'use client';

import React, { useEffect } from 'react';
import BottomNav from '../components/common/BottomNav';
import Sidebar from '../components/common/Sidebar';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/common/Toast';
import { Header } from '../components/common';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { socket } = useSocket();
  const { showToast } = useToast();

  useEffect(() => {
    if (!socket) return;

    socket.on('admin_no_acceptance', (data: any) => {
      console.warn('⚠️ [Admin Alert] No acceptance for order:', data.orderId);
      showToast(data.message || 'Warning: An order has not been accepted within 30 minutes!', 'error');
    });

    socket.on('broadcast_exhausted', (data: any) => {
      console.warn('⚠️ [Admin Alert] Broadcast exhausted:', data.orderId);
      showToast(data.message || 'Warning: A pickup request has reached its maximum time without a champion!', 'error');
    });

    socket.on('order_critical', (data: any) => {
      console.warn('🚨 [Admin Alert] Order critical:', data.orderId);
      showToast(data.message || 'An order is in critical state!', 'error');
    });

    socket.on('order_needs_attention', (data: any) => {
      console.warn('⚠️ [Admin Alert] Order needs attention:', data.orderId);
      showToast(`Order #${(data.orderId || '').slice(-6).toUpperCase()} needs attention! 10 minutes remaining.`, 'error');
    });

    return () => {
      socket.off('admin_no_acceptance');
      socket.off('broadcast_exhausted');
      socket.off('order_critical');
      socket.off('order_needs_attention');
    };
  }, [socket, showToast]);

  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar onCollapse={setIsCollapsed} />
      <div className={`flex-1 transition-all duration-500 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-[280px]'}`}>
        <Header />
        <main className="pb-24 lg:pb-8">
          <div className="min-h-screen">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
