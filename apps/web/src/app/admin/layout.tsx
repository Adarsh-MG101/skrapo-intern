'use client';

import React, { useEffect } from 'react';
import BottomNav from '../components/common/BottomNav';
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

    return () => {
      socket.off('admin_no_acceptance');
    };
  }, [socket, showToast]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pb-24">
        <div className="min-h-screen">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
