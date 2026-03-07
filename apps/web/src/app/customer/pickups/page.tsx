'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { StatusBadge, Loader, EmptyState, Button } from '../../components/common';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { getTimeSlotLabel } from '../../utils/dateTime';
import Link from 'next/link';
import { API_URL } from '../../config/env';

interface Order {
  _id: string;
  scrapTypes: string[];
  estimatedWeight: any;
  scheduledAt: string;
  timeSlot?: string;
  status: string;
  exactAddress: string;
  createdAt: string;
  hasFeedback?: boolean;
}

export default function CustomerPickupsPage() {
  const { token } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState<{isOpen: boolean, orderId: string | null}>({ isOpen: false, orderId: null });
  const [processing, setProcessing] = useState(false);

  const triggerCancel = (orderId: string, status: string) => {
    if (['Accepted', 'Completed'].includes(status)) {
      showToast('Cannot cancel an accepted pickup', 'error');
      return;
    }
    setCancelModal({ isOpen: true, orderId });
  };

  const confirmDelete = async () => {
    if (!cancelModal.orderId) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/orders/${cancelModal.orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (res.ok) {
        showToast('Pickup cancelled successfully', 'success');
        setOrders(prev => prev.filter(o => o._id !== cancelModal.orderId));
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to cancel', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    } finally {
      setProcessing(false);
      setCancelModal({ isOpen: false, orderId: null });
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/history`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          cache: 'no-store'
        });
        const data = await res.json();
        if (res.ok) {
          setOrders(data);
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchOrders();
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const handleRefresh = () => {
      console.log('🔄 [Customer Pickups] Refreshing list via socket');
      const fetchOrders = async () => {
        try {
          const res = await fetch(`${API_URL}/orders/history`, {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include',
            cache: 'no-store'
          });
          const data = await res.json();
          if (res.ok) setOrders(data);
        } catch (err) {
          console.error('Failed to refresh orders:', err);
        }
      };
      fetchOrders();
    };

    socket.on('order_completed_customer', handleRefresh);
    socket.on('order_accepted_customer', handleRefresh);

    return () => {
      socket.off('order_completed_customer', handleRefresh);
      socket.off('order_accepted_customer', handleRefresh);
    };
  }, [socket, token]);

  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Pickups</h1>
              <p className="text-gray-500 font-medium">Track and manage your scheduled recycling services.</p>
            </div>
            <Link href="/customer/schedule">
              <Button variant="primary">Schedule New</Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : orders.length === 0 ? (
            <EmptyState 
              title="No Pickups Found" 
              description="You haven't scheduled any scrap pickups yet. Start recycling today!"
              icon="♻️"
              action={
                <Link href="/customer/schedule">
                  <Button variant="primary">Schedule Your First Pickup</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-6">
              {orders.map((order) => (
                <div key={order._id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow animate-fade-in">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-brand-50 rounded-2xl flex flex-col items-center justify-center text-brand-600 border border-brand-100">
                        <span className="text-[10px] font-black uppercase leading-none">
                          {new Date(order.scheduledAt).toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="text-2xl font-black leading-none mt-0.5">
                          {new Date(order.scheduledAt).getDate()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">
                            {order.scrapTypes.join(', ')}
                          </h3>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-sm text-gray-400 font-medium flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {order.exactAddress}
                        </p>
                        <p className="text-xs text-gray-300 mt-2 font-bold uppercase tracking-wider">
                          {new Date(order.scheduledAt).toLocaleDateString()} @ {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                     <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
                        {/* Contextual actions */}
                        {order.status === 'Completed' && !order.hasFeedback && (
                          <Link href={`/customer/feedback/${order._id}`}>
                             <Button variant="success" size="sm">Rate & Review</Button>
                          </Link>
                        )}
                        {order.hasFeedback && (
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-emerald-100">
                             Feedback Submitted
                          </span>
                        )}
                        <Link href={`/customer/pickups/${order._id}`}>
                           <Button variant="ghost" size="sm">Details</Button>
                        </Link>
                        {!['Accepted', 'Completed'].includes(order.status) && (
                          <button 
                            onClick={() => triggerCancel(order._id, order.status)}
                            className="text-xs font-bold text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg transition-colors border border-red-100 hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        )}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal({ isOpen: false, orderId: null })}
        title="Cancel Pickup"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelModal({ isOpen: false, orderId: null })}>Keep the order</Button>
            <Button variant="primary" onClick={confirmDelete} disabled={processing} className="bg-red-600 hover:bg-red-700 border-none">
              {processing ? 'Cancelling...' : 'Yes, Cancel Pickup'}
            </Button>
          </>
        }
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex flex-col items-center justify-center text-red-600 border border-red-100 mx-auto mb-4 text-2xl">
            🗑️
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">Cancel Pickup?</h3>
          <p className="text-gray-500 font-medium">Are you sure you want to cancel this recycling request? A Scrap Champ may have been ready to pick it up.</p>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}
