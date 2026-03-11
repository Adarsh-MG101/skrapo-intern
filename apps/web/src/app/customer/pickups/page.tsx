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
import { Recycle, Trash2, MapPin, ArrowRight, ListTodo, X, ShieldCheck } from 'lucide-react';
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

  const handleRetry = async (orderId: string) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (res.ok) {
        showToast('Pickup re-broadcasted successfully!', 'success');
        // Refresh local state to 'Requested'
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'Requested' } : o));
      } else {
        const data = await res.json();
        showToast(data.error || 'Retry failed', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
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
          const sorted = data.sort((a: Order, b: Order) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setOrders(sorted);
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
          if (res.ok) {
            const sorted = data.sort((a: Order, b: Order) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setOrders(sorted);
          }
        } catch (err) {
          console.error('Failed to refresh orders:', err);
        }
      };
      fetchOrders();
    };

    socket.on('order_completed_customer', handleRefresh);
    socket.on('order_accepted_customer', handleRefresh);
    socket.on('order_expired', handleRefresh);

    return () => {
      socket.off('order_completed_customer', handleRefresh);
      socket.off('order_accepted_customer', handleRefresh);
      socket.off('order_expired', handleRefresh);
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
            <div className="grid gap-2">
              {orders.map((order) => (
                <div key={order._id} className={`bg-white rounded-xl px-4 py-3 sm:px-6 shadow-sm border ${order.status === 'Expired' ? 'border-amber-200 bg-amber-50/10' : 'border-gray-100'} hover:shadow-md hover:border-brand-100 transition-all animate-fade-in group flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 relative overflow-hidden`}>
                  {/* Status Badge - PC (pinned far right) */}
                  <div className="hidden sm:block absolute right-6 top-1/2 -translate-y-1/2">
                    <StatusBadge status={order.status} />
                  </div>

                  {/* Expired Flag Indicator */}
                  {order.status === 'Expired' && (
                    <div className="absolute top-0 right-0 bg-brand-600 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg shadow-sm z-10 animate-pulse">
                      Needs Attention
                    </div>
                  )}

                  <div className="flex-1 min-w-0 flex items-center gap-3.5 sm:pr-32">
                     <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 flex-shrink-0">
                        <Recycle size={18} />
                     </div>
                     <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black text-gray-900 truncate">
                          {order.scrapTypes.join(', ')}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                           <div className="flex items-center gap-1 min-w-0 max-w-full sm:max-w-[300px]">
                             <MapPin size={10} className="text-gray-300 flex-shrink-0" />
                             <p className="text-[11px] text-gray-400 font-medium truncate" title={order.exactAddress}>
                               {order.exactAddress}
                             </p>
                           </div>
                           <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider whitespace-nowrap">
                             {new Date(order.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                             {' · '}
                             {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 sm:pr-32">
                     {/* Status Badge - Phone (bottom left) */}
                     <div className="sm:hidden flex-shrink-0">
                        <StatusBadge status={order.status} />
                     </div>
                     <div className="flex items-center gap-4 flex-shrink-0">
                        {order.status === 'Completed' && (
                          order.hasFeedback ? (
                            <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1 uppercase tracking-widest opacity-60">
                              <ShieldCheck size={12} />
                              <span className="hidden sm:inline">Reviewed</span>
                            </span>
                          ) : (
                            <Link href={`/customer/feedback/${order._id}`}>
                              <button className="text-[11px] font-black text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-widest">
                                Rate
                              </button>
                            </Link>
                          )
                        )}
                         {order.status === 'Expired' && (
                            <button 
                              onClick={() => handleRetry(order._id)}
                              className="text-[11px] font-black text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-widest"
                            >
                              Retry
                            </button>
                         )}
                        <Link href={`/customer/pickups/${order._id}`}>
                           <button className="text-[11px] font-black text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors uppercase tracking-widest">
                            Details <ArrowRight size={14} />
                           </button>
                        </Link>
                        {!['Accepted', 'Completed', 'Cancelled', 'Expired'].includes(order.status) && (
                           <button 
                             onClick={() => triggerCancel(order._id, order.status)}
                             className="text-[11px] font-black text-gray-300 hover:text-red-500 transition-colors uppercase tracking-widest"
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
