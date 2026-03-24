'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { StatusBadge, Loader, Button } from '../../components/common';
import { useToast } from '../../components/common/Toast';
import { getTimeSlotLabel } from '../../utils/dateTime';
import Link from 'next/link';
import { User, MapPin, Inbox, Zap, ArrowRight, Radio, Ban, Phone, ChevronDown, Clock } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

interface Order {
  _id: string;
  scrapTypes: string[];
  scheduledAt: string;
  timeSlot?: string;
  status: string;
  exactAddress: string;
  customerDetails: {
    name: string;
    mobileNumber: string;
  };
  assignedScrapChampId: string | null;
  notifiedChampsCount?: number;
  viewCount?: number;
  declinedChampIds?: string[];
  createdAt: string;
  champDetails?: {
    name: string;
  };
}

const CountdownTimer: React.FC<{ createdAt: string; onExpire?: () => void }> = ({ createdAt, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    let hasExpired = false;
    const calculateTime = () => {
      if (hasExpired) return;
      const start = new Date(createdAt).getTime();
      const end = start + 30 * 60 * 1000;
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        hasExpired = true;
        setTimeLeft('Expired');
        if (onExpire) {
          // slight delay to prevent react state update warnings during render
          setTimeout(onExpire, 100);
        }
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [createdAt, onExpire]);

  return <span className="font-black tabular-nums">{timeLeft}</span>;
};

export default function AdminOrdersPage() {
  const { apiFetch, isLoading, isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [engagementModal, setEngagementModal] = useState<{ isOpen: boolean; orderId: string | null; data: any }>({
    isOpen: false,
    orderId: null,
    data: null
  });
  const [loadingEngagement, setLoadingEngagement] = useState(false);

  // Manual Assignment State
  const [assignModal, setAssignModal] = useState({
    isOpen: false,
    loading: false,
    champs: [] as any[],
    selectedChampId: '',
    selectedOrderId: '',
    submitting: false
  });

  const fetchEngagement = async (orderId: string) => {
    setLoadingEngagement(true);
    setEngagementModal(prev => ({ ...prev, isOpen: true, orderId, data: null }));
    try {
      const res = await apiFetch(`/orders/admin/${orderId}/engagement`);
      if (res.ok) {
        const data = await res.json();
        setEngagementModal(prev => ({ ...prev, data }));
      }
    } catch (err) {
      console.error('Engagement fetch error:', err);
    } finally {
      setLoadingEngagement(false);
    }
  };

  const openAssignModal = async (orderId: string) => {
    setAssignModal(prev => ({ ...prev, isOpen: true, loading: true, selectedOrderId: orderId }));
    try {
      const res = await apiFetch('/orders/admin/scrap-champs');
      if (res.ok) {
        const champs = await res.json();
        const activeChamps = champs.filter((c: any) => c.isActive !== false);
        setAssignModal(prev => ({ ...prev, champs: activeChamps, loading: false }));
      }
    } catch (err) {
      showToast('Failed to fetch champs', 'error');
      setAssignModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleManualAssign = async () => {
    if (!assignModal.selectedChampId || !assignModal.selectedOrderId) return;
    setAssignModal(prev => ({ ...prev, submitting: true }));
    try {
      const res = await apiFetch(`/orders/admin/${assignModal.selectedOrderId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ champId: assignModal.selectedChampId })
      });
      if (res.ok) {
        showToast('Champion assigned successfully!', 'success');
        setAssignModal(prev => ({ ...prev, isOpen: false, submitting: false, selectedChampId: '', selectedOrderId: '' }));
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Assignment failed', 'error');
        setAssignModal(prev => ({ ...prev, submitting: false }));
      }
    } catch (err) {
      showToast('Assignment error', 'error');
      setAssignModal(prev => ({ ...prev, submitting: false }));
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await apiFetch(`/orders/admin/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`Status updated to ${newStatus}`, 'success');
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Error updating status', 'error');
    }
  };

  const [statusFilter, setStatusFilter] = useState('All');

  const fetchData = async () => {
    try {
      const res = await apiFetch('/orders/admin');
      if (res.ok) {
        const allOrders: Order[] = await res.json();
        const liveOrders = allOrders.filter(o => {
          const isExpired = o.status === 'Requested' && (new Date(o.createdAt).getTime() + 30 * 60 * 1000 <= Date.now());
          return !isExpired && ['Requested', 'Assigned', 'Accepted', 'Arrived', 'Arriving', 'Picking', 'Problem'].includes(o.status);
        });
         const sortedLiveOrders = liveOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
         setOrders(sortedLiveOrders);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'Active') return ['Assigned', 'Accepted', 'Arrived', 'Arriving', 'Picking'].includes(o.status);
    if (statusFilter === 'Requested') return o.status === 'Requested';
    if (statusFilter === 'Problem') return o.status === 'Problem';
    return true; // 'All'
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      fetchData();
    }
  }, [isLoading, isAuthenticated, apiFetch]);

  useEffect(() => {
    if (!socket) return;

    const handleRefresh = () => {
      fetchData();
    };

    socket.on('new_pickup_request', handleRefresh);
    socket.on('pickup_cancelled', handleRefresh);
    socket.on('order_accepted', handleRefresh);
    socket.on('order_declined', handleRefresh);
    socket.on('order_completed', handleRefresh);
    socket.on('broadcast_exhausted', handleRefresh);

    return () => {
      socket.off('new_pickup_request', handleRefresh);
      socket.off('pickup_cancelled', handleRefresh);
      socket.off('order_accepted', handleRefresh);
      socket.off('order_declined', handleRefresh);
      socket.off('order_completed', handleRefresh);
      socket.off('broadcast_exhausted', handleRefresh);
    };
  }, [socket]);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                 Allocation Center <Zap className="text-brand-500 fill-brand-500" size={28} />
              </h1>
              <p className="text-gray-500 font-medium">Monitor real-time pickup broadcasts and champion engagement.</p>
            </div>

             <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
                {['All', 'Requested', 'Active', 'Problem'].map((f) => (
                   <button
                     key={f}
                     onClick={() => setStatusFilter(f)}
                     className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest transition-all whitespace-nowrap ${
                       statusFilter === f 
                         ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
                         : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                     }`}
                   >
                     {f}
                   </button>
                ))}
             </div>
           </div>

           {loading ? (
             <div className="flex justify-center py-20">
               <Loader size="lg" />
             </div>
           ) : (
             <div className="space-y-6">
               {/* Mobile View: Cards */}
               <div className="grid grid-cols-1 gap-4 md:hidden">
                 {filteredOrders.length === 0 ? (
                   <div className="bg-white rounded-[2.5rem] p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                     <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 mb-4 border border-gray-100">
                       <Inbox size={32} />
                     </div>
                     <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Queue Clear</p>
                     <p className="text-gray-900 font-bold mt-1">No pickups in queue</p>
                     {statusFilter !== 'All' && (
                       <button onClick={() => setStatusFilter('All')} className="mt-4 text-[10px] font-black text-brand-500 uppercase tracking-widest underline">Show All Orders</button>
                     )}
                   </div>
                 ) : (
                   filteredOrders.map((order) => (
                    <div key={order._id} className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <Link href={`/admin/orders/${order._id}`} className="flex-1 min-w-0 pr-4">
                          <p className="font-black text-gray-900 leading-tight mb-1 truncate">{order.scrapTypes.join(', ')}</p>
                          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                             <Clock size={10} className="text-brand-500" />
                             {new Date(order.scheduledAt).toLocaleDateString()} · {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </Link>
                        <StatusBadge status={(order.status === 'Requested' && (new Date(order.createdAt).getTime() + 30 * 60 * 1000 <= Date.now())) ? 'Expired' : order.status} />
                      </div>

                      <div className="grid grid-cols-2 gap-3 py-4 border-y border-gray-50">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 border border-brand-100 shrink-0"><User size={14} /></div>
                           <div className="min-w-0">
                              <p className="text-[10px] font-black text-gray-900 truncate">{order.customerDetails?.name || 'Deleted'}</p>
                              <p className="text-[9px] font-bold text-gray-400 truncate">{order.customerDetails?.mobileNumber || 'N/A'}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200 shrink-0"><MapPin size={14} /></div>
                          <p className="text-[10px] text-gray-500 font-medium leading-tight truncate-2-lines">{order.exactAddress}</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-4">
                         {/* Metrics row */}
                         <div className="flex items-center justify-between gap-3">
                            <div className="flex gap-2">
                               <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl border border-blue-100 flex items-center gap-2" title="Notified">
                                  <span className="text-[10px] font-black">{order.notifiedChampsCount || 0}</span>
                                  <span className="text-[8px] font-bold uppercase tracking-widest">Notified</span>
                               </div>
                               <div className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl border border-red-100 flex items-center gap-2" title="Declined">
                                  <span className="text-[10px] font-black">{order.declinedChampIds?.length || 0}</span>
                                  <span className="text-[8px] font-bold uppercase tracking-widest">Declined</span>
                               </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => fetchEngagement(order._id)} className="h-8 rounded-xl px-3 py-0 text-[9px] uppercase tracking-widest">
                               Track
                            </Button>
                         </div>

                         {/* Allocation Bar */}
                         <div className="p-1 bg-gray-50/50 rounded-2xl border border-gray-100">
                             {order.assignedScrapChampId ? (
                                <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm">
                                   <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 font-black text-[10px] border border-brand-100 overflow-hidden">
                                         {order.champDetails?.name?.charAt(0) || <User size={12} />}
                                      </div>
                                      <div className="flex flex-col">
                                         <p className="text-[9px] font-bold text-gray-900 leading-tight truncate max-w-[100px]">{order.champDetails?.name || 'Partner'}</p>
                                         <button onClick={() => openAssignModal(order._id)} className="text-[8px] font-black text-brand-500 uppercase tracking-widest text-left mt-0.5">Change</button>
                                      </div>
                                   </div>

                                </div>
                             ) : (
                                <div className="flex items-center justify-between p-2">
                                   <div className="flex items-center gap-2 overflow-hidden">
                                      <Radio size={14} className="text-blue-500 animate-pulse shrink-0" />
                                      <div className="flex flex-col overflow-hidden">
                                         <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest truncate">Broadcasting Live</span>
                                         <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                            <CountdownTimer createdAt={order.createdAt} onExpire={() => fetchData()} />
                                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse shrink-0" />
                                         </div>
                                      </div>
                                   </div>
                                   <Button variant="primary" size="sm" onClick={() => openAssignModal(order._id)} className="h-8 rounded-xl px-4 py-0 text-[9px] uppercase tracking-widest">
                                      Assign
                                   </Button>
                                </div>
                             )}
                         </div>
                      </div>
                    </div>
                   ))
                 )}
               </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-4 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Order Info</th>
                        <th className="px-4 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Customer</th>
                        <th className="px-4 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Address</th>
                        <th className="px-4 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Engagement</th>
                        <th className="px-4 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="px-4 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Allocation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {filteredOrders.length === 0 ? (
                         <tr>
                           <td colSpan={6} className="py-20 text-center">
                              <div className="flex flex-col items-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-[1.5rem] flex items-center justify-center text-gray-200 mb-4 border border-gray-100">
                                  <Inbox size={40} />
                                </div>
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Queue Clear</p>
                              </div>
                           </td>
                         </tr>
                       ) : (
                         filteredOrders.map((order) => (
                          <tr key={order._id} className="hover:bg-gray-50/30 transition-colors group">
                            <td className="px-4 py-6">
                               <Link href={`/admin/orders/${order._id}`} className="group/link block">
                                 <p className="font-black text-gray-900 group-hover/link:text-brand-600 transition-colors tracking-tight text-base mb-1 truncate max-w-[150px]">{order.scrapTypes.join(', ')}</p>
                                 <p className="text-[10px] text-gray-400 font-black flex items-center gap-1.5 uppercase tracking-widest truncate">
                                   <ArrowRight size={10} className="text-brand-500 flex-shrink-0" />
                                   {new Date(order.scheduledAt).toLocaleDateString()} @ {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </p>
                                 <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5 opacity-70">
                                   <Clock size={10} className="text-blue-400" />
                                   Placed: {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </p>
                               </Link>
                            </td>
                            <td className="px-4 py-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 border border-brand-100 flex-shrink-0"><User size={18} /></div>
                                 <div className="min-w-0 max-w-[150px]">
                                   <p className="font-black text-gray-900 leading-tight truncate">{order.customerDetails?.name || 'Deleted User'}</p>
                                   <p className="text-[10px] text-brand-600 font-bold tracking-wider mt-0.5 truncate">{order.customerDetails?.mobileNumber || 'N/A'}</p>
                                 </div>
                              </div>
                            </td>
                            <td className="px-4 py-6 max-w-[180px]">
                              <p className="text-[13px] text-gray-500 font-medium truncate group-hover:text-gray-900 transition-colors" title={order.exactAddress}>
                                {order.exactAddress}
                              </p>
                            </td>
                            <td className="px-4 py-6">
                                <div className="flex justify-center gap-2 mb-3">
                                   <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-blue-100" title="Notified">
                                      {order.notifiedChampsCount || 0}
                                   </div>
                                   <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-red-100" title="Declined">
                                      {order.declinedChampIds?.length || 0}
                                   </div>
                                </div>
                               <button 
                                 onClick={() => fetchEngagement(order._id)}
                                 className="mt-2 w-full py-1.5 px-2 bg-white rounded-lg border border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                               >
                                 Engagement View
                               </button>
                            </td>
                            <td className="px-4 py-6">
                               <div className="relative group/status flex items-center">
                                 <StatusBadge status={(order.status === 'Requested' && (new Date(order.createdAt).getTime() + 30 * 60 * 1000 <= Date.now())) ? 'Expired' : order.status} />
                                 <select 
                                   className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                   value={order.status}
                                   onChange={(e) => updateStatus(order._id, e.target.value)}
                                 >
                                   <option value="Requested">Requested</option>
                                   <option value="Accepted">Accepted</option>
                                   <option value="Cancelled">Rejected (Cancel)</option>
                                   <option value="Problem">Problem</option>
                                 </select>
                                 <ChevronDown size={14} className="text-gray-400 ml-1 opacity-0 group-hover/status:opacity-100 transition-opacity" />
                               </div>
                            </td>
                            <td className="px-4 py-6">
                              {order.assignedScrapChampId ? (
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 font-black text-xs border border-emerald-100 shadow-sm flex-shrink-0">
                                     {order.champDetails?.name?.charAt(0) || <User size={16} />}
                                   </div>
                                   <div className="min-w-0 max-w-[150px]">
                                     <p className="text-xs font-black text-gray-900 leading-none mb-1.5 truncate">{order.champDetails?.name || 'Partner'}</p>
                                     <div className="flex items-center gap-2">
                                        {order.status !== 'Completed' && (
                                           <button onClick={() => openAssignModal(order._id)} className="text-[9px] font-black text-brand-500 hover:text-brand-700 uppercase tracking-widest underline underline-offset-2">Reassign</button>
                                        )}
                                     </div>
                                   </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-4">
                                   <div className="relative flex-shrink-0">
                                      <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-500 border border-gray-100 shadow-inner">
                                         <Radio size={20} className="animate-pulse" />
                                      </div>
                                   </div>
                                   <div className="flex flex-col min-w-0">
                                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none truncate flex items-center justify-between">
                                         Broadcasting
                                         <button onClick={() => openAssignModal(order._id)} className="text-[9px] font-black text-brand-500 uppercase tracking-widest underline underline-offset-2 ml-4">Assign Now</button>
                                      </span>
                                      <span className="text-[10px] font-bold text-blue-600 mt-1.5 flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                                         Live Now <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
                                         <span className="ml-1 text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                                            <CountdownTimer createdAt={order.createdAt} onExpire={() => fetchData()} />
                                         </span>
                                      </span>
                                   </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                       )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={engagementModal.isOpen}
        onClose={() => setEngagementModal({ isOpen: false, orderId: null, data: null })}
        title="Champion Engagement Tracker"
      >
        <div className="space-y-6">
          {loadingEngagement ? (
            <div className="flex justify-center py-10"><Loader size="md" /></div>
          ) : !engagementModal.data ? (
            <div className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-xs">Failed to load engagement data</div>
          ) : (
            <div className="animate-fade-in">
              <div className="flex gap-4 mb-8">
                <div className="flex-1 bg-blue-50/50 p-4 rounded-3xl border border-blue-100/50 text-center">
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Total Notified</p>
                   <p className="text-3xl font-black text-blue-700">{engagementModal.data.notified.length}</p>
                </div>
                <div className="flex-1 bg-red-50/50 p-4 rounded-3xl border border-red-100/50 text-center">
                   <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Total Declined</p>
                   <p className="text-3xl font-black text-red-700">{engagementModal.data.declined.length}</p>
                </div>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Regional Champions Log</h4>
                {engagementModal.data.notified.length === 0 ? (
                  <p className="text-center py-10 text-gray-400 font-medium italic">No champions identified in this regional pincode.</p>
                ) : (
                  engagementModal.data.notified.map((champ: any) => (
                    <div key={champ.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm relative overflow-hidden">
                          {champ.profilePhoto ? (
                            <img src={champ.profilePhoto} alt={champ.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={18} />
                          )}
                          {champ.hasDeclined && (
                            <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                              <Ban size={20} className="text-red-500/40" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 tracking-tight">{champ.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-widest">
                            <Phone size={10} className="text-brand-500" /> {champ.mobileNumber}
                          </p>
                        </div>
                      </div>
                      <div>
                        {champ.hasDeclined ? (
                          <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-200">Declined</span>
                        ) : (
                          <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-200">Notified</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={assignModal.isOpen}
        onClose={() => setAssignModal(prev => ({ ...prev, isOpen: false }))}
        title="Manual Partner Assignment"
        size="md"
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-500 font-medium">
            Manually assigning a partner will override any ongoing broadcasts. The newly selected partner will receive an immediate SMS notification.
          </p>
          
          {assignModal.loading ? (
            <div className="flex justify-center py-10"><Loader size="md" /></div>
          ) : assignModal.champs.length === 0 ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold text-center border border-red-100">
              No active champions available to assign.
            </div>
          ) : (
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Select Champion</label>
                  <select 
                    value={assignModal.selectedChampId}
                    onChange={(e) => setAssignModal(prev => ({ ...prev, selectedChampId: e.target.value }))}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-800 focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="" disabled>-- Choose a partner --</option>
                    {assignModal.champs.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} - {c.serviceArea} ({c.mobileNumber})
                      </option>
                    ))}
                  </select>
               </div>
               
               <Button 
                 fullWidth 
                 className="py-4 text-sm mt-4 rounded-2xl" 
                 isLoading={assignModal.submitting}
                 disabled={!assignModal.selectedChampId}
                 onClick={handleManualAssign}
               >
                 Assign Order Now
               </Button>
            </div>
          )}
        </div>
      </Modal>

    </ProtectedRoute>
  );
}
