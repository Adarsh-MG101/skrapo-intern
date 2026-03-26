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
