'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { StatusBadge, Loader, EmptyState, Button, DateTimePicker } from '../../components/common';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { getTimeSlotLabel } from '../../utils/dateTime';
import Link from 'next/link';
import { Recycle, Trash2, MapPin, ListTodo, X, ShieldCheck, Search, RefreshCw, ArrowRight, Inbox, Phone } from 'lucide-react';

const statuses = ['All', 'Active', 'Completed', 'Cancelled', 'Expired'];

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
  const { token, apiFetch } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState<{isOpen: boolean, orderId: string | null}>({ isOpen: false, orderId: null });
  const [rescheduleModal, setRescheduleModal] = useState<{isOpen: boolean, orderId: string | null, date: string, time: string}>({ isOpen: false, orderId: null, date: '', time: 'any' });
  const [processing, setProcessing] = useState(false);

  const [status, setStatus] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const resetFilters = () => {
    setStatus('All');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setCurrentPage(1);
  };

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
      const res = await apiFetch(`/orders/${cancelModal.orderId}`, {
        method: 'DELETE'
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
      const res = await apiFetch(`/orders/${orderId}/retry`, {
        method: 'POST'
      });

      if (res.ok) {
        showToast('Pickup re-broadcasted successfully!', 'success');
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
        const res = await apiFetch('/orders/history', {
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
          const res = await apiFetch('/orders/history', {
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

  const filteredOrders = orders.filter(order => {
    const searchLow = search.toLowerCase();
    const matchesSearch = 
      order.exactAddress.toLowerCase().includes(searchLow) ||
      order.scrapTypes.some(t => t.toLowerCase().includes(searchLow));
    
    const isExpired = order.status === 'Requested' && (new Date(order.createdAt).getTime() + 30 * 60 * 1000 <= Date.now());
    const displayStatus = isExpired ? 'Expired' : order.status;

    let matchesStatus = true;
    if (status === 'All') {
      matchesStatus = true;
    } else if (status === 'Active') {
      matchesStatus = ['Requested', 'Assigned', 'Accepted', 'Arrived', 'Arriving', 'Picking', 'Problem'].includes(displayStatus);
    } else {
      matchesStatus = displayStatus === status;
    }
    
    let matchesDate = true;
    const orderDate = new Date(order.scheduledAt || order.createdAt).getTime();
    if (startDate) {
      matchesDate = matchesDate && orderDate >= new Date(startDate).getTime();
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && orderDate <= endOfDay.getTime();
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const maxVisible = 3;
    let start = Math.max(1, currentPage - 1);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, startDate, endDate]);

  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                My Pickups <ListTodo className="text-brand-500" />
              </h1>
              <p className="text-gray-500 font-medium">Track and manage your scheduled recycling services.</p>
            </div>
          </div>

          {/* Ultra-Compact Filter Bar */}
          <div className="bg-white rounded-2xl p-2.5 mb-8 border border-gray-100 shadow-lg shadow-brand-500/5 flex flex-col gap-2.5 max-w-6xl mx-auto w-full overflow-hidden">
             {/* Row 1: Search & Status */}
             <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                <div className="relative flex-1 w-full text-left">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500 opacity-40">
                    <Search size={14} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search address, scrap items..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-100 rounded-xl text-[11px] font-bold text-gray-700 outline-none focus:bg-white focus:border-brand-500/20 transition-all"
                  />
                </div>
                
                <div className="w-full sm:w-48">
                  <select 
                    className="w-full px-4 py-2 bg-gray-50/50 border border-gray-100 rounded-xl text-[11px] font-black uppercase tracking-widest focus:bg-white focus:border-brand-500/20 transition-all outline-none cursor-pointer"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
             </div>

             {/* Row 2: Date Range & Reset */}
             <div className="flex items-center gap-2">
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <DateTimePicker 
                    label="From"
                    allowPastDates={true}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <DateTimePicker 
                    label="To" 
                    allowPastDates={true}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <button 
                  onClick={resetFilters}
                  className="w-9 h-9 flex-shrink-0 bg-gray-50 text-gray-400 rounded-xl hover:bg-brand-50 hover:text-brand-600 transition-all flex items-center justify-center border border-gray-100 active:scale-95"
                  title="Reset"
                >
                  <RefreshCw size={14} />
                </button>
             </div>
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
            <>
              <div className="grid gap-2">
                {currentItems.map((order) => (
                <div key={order._id} className={`bg-white rounded-xl px-4 py-3 sm:px-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-100 transition-all animate-fade-in group flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0 relative overflow-hidden`}>
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                     <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 flex-shrink-0">
                        <Recycle size={20} />
                     </div>
                     <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-black text-gray-900 truncate">
                          {order.scrapTypes.join(', ')}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                           <div className="flex items-center gap-1.5 min-w-0">
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

                  {/* Right: Status & Actions */}
                  <div className="flex items-center justify-center sm:justify-end gap-4 sm:gap-6 flex-wrap sm:flex-nowrap border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-50">
                     <div className="flex-shrink-0">
                        <StatusBadge status={order.status} />
                     </div>
                     
                     <div className="flex items-center gap-2 flex-shrink-0">
                        {order.status === 'Completed' && (
                           order.hasFeedback ? (
                             <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1">
                               <ShieldCheck size={12} />
                               <span className="text-[10px] font-black uppercase tracking-widest">Reviewed</span>
                             </div>
                           ) : (
                             <Link href={`/customer/feedback/${order._id}`}>
                               <Button variant="success" size="sm" className="rounded-xl px-4 py-1.5 h-auto text-[10px] uppercase tracking-widest leading-none">
                                 Rate
                               </Button>
                             </Link>
                           )
                        )}
                        {order.status === 'Expired' && (
                           <Button 
                             variant="warning" 
                             size="sm" 
                             onClick={() => handleRetry(order._id)}
                             className="rounded-xl px-4 py-1.5 h-auto text-[10px] uppercase tracking-widest leading-none"
                           >
                             Retry
                           </Button>
                        )}
                        <Link href={`/customer/pickups/${order._id}`}>
                           <Button variant="secondary" size="sm" className="rounded-xl px-4 py-1.5 h-auto text-[10px] uppercase tracking-widest leading-none border border-brand-200">
                             Details
                           </Button>
                        </Link>
                        {['Requested', 'Accepted', 'Assigned'].includes(order.status) && (
                           <>
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               onClick={() => setRescheduleModal({ isOpen: true, orderId: order._id, date: order.scheduledAt?.split('T')[0] || '', time: order.timeSlot || 'any' })}
                               className="rounded-xl px-4 py-1.5 h-auto text-[10px] sm:text-[11px] font-black uppercase tracking-[0.1em] leading-none text-brand-600 hover:bg-brand-50"
                             >
                               Reschedule
                             </Button>
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               onClick={() => triggerCancel(order._id, order.status)}
                               className="rounded-xl px-4 py-1.5 h-auto text-[10px] sm:text-[11px] font-black uppercase tracking-[0.1em] leading-none text-gray-400 hover:text-red-500 hover:bg-red-50"
                             >
                               Cancel
                             </Button>
                           </>
                        )}
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 pb-8 flex justify-center">
                <div className="flex items-center justify-center gap-3 px-4">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => paginate(currentPage - 1)}
                    className="w-10 h-10 flex-shrink-0 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-600 hover:border-brand-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm shadow-brand-500/5 group"
                  >
                    <ArrowRight size={20} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                  </button>
                  
                  <div className="flex gap-2">
                    {getPageNumbers().map((number) => (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`w-10 h-10 flex-shrink-0 rounded-xl font-black text-xs transition-all tracking-tighter shadow-sm border ${
                          currentPage === number
                            ? 'bg-brand-600 text-white border-brand-600 shadow-brand-500/20 scale-110 z-10'
                            : 'bg-white text-gray-600 border-gray-100 hover:border-brand-200 hover:text-brand-600'
                        }`}
                      >
                        {number}
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => paginate(currentPage + 1)}
                    className="w-10 h-10 flex-shrink-0 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-600 hover:border-brand-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm shadow-brand-500/5 group"
                  >
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}

            {filteredOrders.length === 0 && (
              <div className="bg-white rounded-[3rem] py-24 text-center border border-gray-100 shadow-xl shadow-gray-100/50 flex flex-col items-center mt-4">
                 <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center text-gray-300 mb-8 border border-white">
                    <Inbox size={40} />
                 </div>
                 <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">No Matching Results</h3>
                 <p className="text-gray-400 font-medium text-sm">Adjust your filters to find what you're looking for.</p>
                 <button onClick={resetFilters} className="mt-8 text-brand-600 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-3 transition-all">
                    Reset All Filters <RefreshCw size={14} />
                 </button>
              </div>
            )}
          </>
        )}

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

        {/* Reschedule Modal */}
        <Modal
          isOpen={rescheduleModal.isOpen}
          onClose={() => setRescheduleModal({ ...rescheduleModal, isOpen: false })}
          title="Reschedule Pickup"
          footer={
            <Button 
                variant="primary" 
                fullWidth 
                onClick={() => setRescheduleModal({ ...rescheduleModal, isOpen: false })} 
                className="rounded-2xl shadow-lg shadow-brand-500/20 py-4 font-black uppercase tracking-widest text-sm bg-brand-600 hover:bg-brand-700 h-auto"
              >
                 Got it
              </Button>
          }
        >
          <div className="flex flex-col items-center text-center py-8 px-4">
            <div className="w-20 h-20 bg-brand-50/50 rounded-3xl flex items-center justify-center text-brand-600 border border-brand-100/50 mb-8 shadow-inner relative group">
               <Phone size={36} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
            </div>

            <p className="text-gray-600 font-medium text-xl leading-relaxed max-w-sm">
               Please reach out to us at <br/>
               <a href="tel:+917975136270" className="text-brand-600 font-black decoration-brand-300 underline underline-offset-8 decoration-2 hover:text-brand-700 transition-all tracking-tight text-2xl inline-block mt-1 mb-1">+917975136270</a> <br/>
               if the order needs to be rescheduled for a suitable time!
            </p>
          </div>
        </Modal>
      </div>
    </div>
  </ProtectedRoute>
);
}
