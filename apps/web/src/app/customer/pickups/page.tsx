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
import { Recycle, Trash2, MapPin, Calendar, Clock, ArrowRight, MessageSquare, ListTodo, X, ShieldCheck } from 'lucide-react';
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                My Pickups <ListTodo className="text-brand-500" />
              </h1>
              <p className="text-gray-500 font-medium">Track and manage your scheduled recycling services.</p>
            </div>
            <Link href="/customer/schedule">
              <Button variant="primary" className="rounded-2xl px-8 shadow-lg shadow-brand-500/20">Schedule New</Button>
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
              icon={Recycle}
              action={
                <Link href="/customer/schedule">
                  <Button variant="primary" className="rounded-2xl px-10">Schedule Your First Pickup</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-6">
              {orders.map((order) => (
                <div key={order._id} className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-brand-100 transition-all animate-fade-in group">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex items-start gap-6">
                      <div className="w-20 h-20 bg-brand-50 rounded-3xl flex flex-col items-center justify-center text-brand-600 border border-brand-100 shadow-inner group-hover:scale-105 transition-transform">
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-brand-400">
                          {new Date(order.scheduledAt).toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="text-3xl font-black leading-none">
                          {new Date(order.scheduledAt).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="text-xl font-black text-gray-900 group-hover:text-brand-600 transition-colors">
                            {order.scrapTypes.join(', ')}
                          </h3>
                          <StatusBadge status={order.status} />
                        </div>
                        <div className="space-y-2">
                           <p className="text-sm text-gray-400 font-bold flex items-center gap-2">
                             <MapPin size={16} className="text-brand-500" />
                             <span className="truncate">{order.exactAddress}</span>
                           </p>
                           <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.1em] flex items-center gap-2">
                             <Calendar size={14} className="text-gray-300" />
                             {new Date(order.scheduledAt).toLocaleDateString()} 
                             <span className="w-1 h-1 bg-gray-200 rounded-full" />
                             <Clock size={14} className="text-gray-300" />
                             {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </p>
                        </div>
                      </div>
                    </div>
                     <div className="flex flex-wrap items-center gap-3 lg:self-center">
                        {order.status === 'Completed' && !order.hasFeedback && (
                          <Link href={`/customer/feedback/${order._id}`}>
                             <Button variant="success" size="sm" className="rounded-xl flex items-center gap-2">
                                <MessageSquare size={16} /> Rate & Review
                             </Button>
                          </Link>
                        )}
                        {order.hasFeedback && (
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                             <ShieldCheck size={14} /> Feedback Submitted
                          </span>
                        )}
                        <Link href={`/customer/pickups/${order._id}`}>
                           <Button variant="ghost" size="sm" className="rounded-xl flex items-center gap-2">
                             Details <ArrowRight size={16} />
                           </Button>
                        </Link>
                        {!['Accepted', 'Completed'].includes(order.status) && (
                          <button 
                            onClick={() => triggerCancel(order._id, order.status)}
                            className="text-xs font-black text-gray-400 hover:text-red-500 px-4 py-2 rounded-xl transition-all border border-gray-100 hover:border-red-100 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={16} /> Cancel
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
          <div className="flex w-full gap-3">
            <Button variant="ghost" fullWidth onClick={() => setCancelModal({ isOpen: false, orderId: null })} className="rounded-xl">
               Keep Order
            </Button>
            <Button variant="primary" fullWidth onClick={confirmDelete} disabled={processing} className="bg-red-500 hover:bg-red-600 border-none rounded-xl shadow-lg shadow-red-500/20">
               {processing ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
          </div>
        }
      >
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 border border-red-100 mx-auto mb-6 shadow-inner relative">
            <Trash2 size={32} />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center border border-red-100">
               <X size={14} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Cancel this pickup?</h3>
          <p className="text-gray-500 font-medium px-4">
            Are you sure you want to stop this recycling request? A Scrap Champ might already be on their way.
          </p>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}
