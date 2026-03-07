'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from '../components/common/Toast';
import { SOCKET_URL } from '../config/env';

interface SocketContextData {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextData>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true
    });

    newSocket.on('connect', () => {
      console.log('Connected to real-time server');
    });

    // Admin Events
    newSocket.on('new_pickup_request', (data) => {
      console.log('⚡ [Socket.IO] Received new_pickup_request payload:', data);
      showToast(`🚨 New Request in ${data.area || 'your zone'}! Assign a champ now.`, 'info', true);
    });

    newSocket.on('pickup_cancelled', (data) => {
      console.log('⚡ [Socket.IO] Received pickup_cancelled payload:', data);
      showToast(`🚫 A pickup in ${data.area || 'your zone'} was cancelled by the customer.`, 'error', true);
    });

    newSocket.on('order_accepted', (data) => {
      console.log('⚡ [Socket.IO] Received order_accepted payload:', data);
      showToast(`✅ ${data.message}`, 'success', true);
    });

    newSocket.on('order_declined', (data) => {
      console.log('⚡ [Socket.IO] Received order_declined payload:', data);
      showToast(`⚠️ ${data.message}`, 'error', true);
    });

    newSocket.on('order_completed', (data) => {
      console.log('⚡ [Socket.IO] Received order_completed payload:', data);
      showToast(`🏆 ${data.message}`, 'success', true);
    });

    newSocket.on('auto_assign_success', (data) => {
      console.log('⚡ [Socket.IO] Received auto_assign_success payload:', data);
      showToast(`🤖 ${data.message}`, 'success', true);
    });

    newSocket.on('auto_assign_failed', (data) => {
      console.log('⚡ [Socket.IO] Received auto_assign_failed payload:', data);
      showToast(`⚠️ ${data.message}`, 'error', true);
    });

    // Champ Events
    newSocket.on('new_job_assigned', (data) => {
      console.log('⚡ [Socket.IO] Received new_job_assigned payload:', data);
      showToast('🔔 New job assigned to you! Check your Active Jobs.', 'info', true);
    });

    // Customer Events
    newSocket.on('order_accepted_customer', (data) => {
      console.log('⚡ [Socket.IO] Received order_accepted_customer payload:', data);
      showToast(`✅ ${data.message}`, 'success', true);
    });

    newSocket.on('order_completed_customer', (data) => {
      console.log('⚡ [Socket.IO] Received order_completed_customer payload:', data);
      showToast(`🏆 ${data.message}`, 'success', true);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
