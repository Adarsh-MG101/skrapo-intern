'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../config/env';

interface SocketContextData {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextData>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Only connect socket with a real JWT token.
    // 'session_active' or other placeholders will fail jwt.verify() on the server.
    const isValidJWT = token && token.split('.').length === 3 && token !== 'session_active';
    
    if (!isValidJWT) {
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
      console.log('⚡ [Socket.IO] Data Sync: new_pickup_request', data);
      // No toast here, FCM handles the alert. Pages listen for this to refresh lists.
    });

    newSocket.on('pickup_cancelled', (data) => {
      console.log('⚡ [Socket.IO] Data Sync: pickup_cancelled', data);
    });

    newSocket.on('order_accepted', (data) => {
      console.log('⚡ [Socket.IO] Data Sync: order_accepted', data);
    });

    newSocket.on('order_declined', (data) => {
      console.log('⚡ [Socket.IO] Data Sync: order_declined', data);
    });

    newSocket.on('order_completed', (data) => {
      console.log('⚡ [Socket.IO] Data Sync: order_completed', data);
    });

    newSocket.on('auto_assign_success', (data) => {
      console.log('⚡ [Socket.IO] Data Sync: auto_assign_success', data);
    });

    newSocket.on('auto_assign_failed', (data) => {
      console.log('⚡ [Socket.IO] Data Sync: auto_assign_failed', data);
    });

    newSocket.on('order_needs_attention', (data) => {
      console.log('⚡ [Socket.IO] Data Sync: order_needs_attention', data);
    });

    newSocket.on('order_critical', (data) => {
      console.log('⚡ [Socket.IO] Data Sync: order_critical', data);
    });

    // Champ Events
    newSocket.on('new_job_assigned', (data) => {
      console.log('⚡ [Socket.IO] Data Sync: new_job_assigned', data);
    });

    newSocket.on('new_available_job', (data) => {
      console.log('⚡ [Socket.IO] Data Sync: new_available_job', data);
    });

    newSocket.on('new_job_assigned_manual', (data) => {
      console.log('⚡ [Socket.IO] Data Sync: new_job_assigned_manual', data);
    });

    newSocket.on('orderAssigned', (data) => {
      console.log('⚡ [Socket.IO] Data Sync: orderAssigned', data);
    });

    // Customer Events
    newSocket.on('order_accepted_customer', (data) => {
      console.log('⚡ [Socket.IO] Data Sync: order_accepted_customer', data);
    });

    newSocket.on('order_completed_customer', (data) => {
      console.log('⚡ [Socket.IO] Data Sync: order_completed_customer', data);
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
