'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { StatusBadge, Loader } from '../../components/common';
import { getTimeSlotLabel } from '../../utils/dateTime';
import Link from 'next/link';
import { User, MapPin, Inbox, Zap, ArrowRight, Radio, Ban, Phone } from 'lucide-react';
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [engagementModal, setEngagementModal] = useState<{ isOpen: boolean; orderId: string | null; data: any }>({
    isOpen: false,
    orderId: null,
    data: null
  });
  const [loadingEngagement, setLoadingEngagement] = useState(false);

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

  const fetchData = async () => {
    try {
      const res = await apiFetch('/orders/admin');
      if (res.ok) {
        const allOrders: Order[] = await res.json();
        const liveOrders = allOrders.filter(o => {
          const isExpired = o.status === 'Requested' && (new Date(o.createdAt).getTime() + 30 * 60 * 1000 <= Date.now());
          return !isExpired && ['Requested', 'Assigned', 'Accepted', 'Arrived', 'Picking'].includes(o.status);
        });
        setOrders(liveOrders);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

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
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Mobile View: Cards */}
              <div className="grid grid-cols-1 gap-6 md:hidden">
                {orders.length === 0 ? (
                  <div className="bg-white rounded-[2rem] p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 mb-4 border border-gray-100">
                      <Inbox size={32} />
                    </div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Queue Clear</p>
                    <p className="text-gray-900 font-bold mt-1">No pickups in queue</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div key={order._id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <Link href={`/admin/orders/${order._id}`} className="flex-1">
                          <p className="font-black text-gray-900 leading-tight mb-1">{order.scrapTypes.join(', ')}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                             {new Date(order.scheduledAt).toLocaleDateString()} @ {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </Link>
                        <StatusBadge status={order.status} />
                      </div>

                      <div className="flex items-center gap-3 py-3 border-y border-gray-50">
                         <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 font-bold border border-white"><User size={20} /></div>
                          <div>
                             <p className="text-xs font-black text-gray-900">{order.customerDetails?.name || 'Deleted User'}</p>
                             <p className="text-[10px] font-bold text-brand-600">{order.customerDetails?.mobileNumber || 'N/A'}</p>
                          </div>
                      </div>

                      <div className="flex items-start gap-3">
                         <MapPin size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
                         <p className="text-xs text-gray-500 font-medium leading-relaxed">{order.exactAddress}</p>
                      </div>

                      <div className="pt-2 space-y-4">
                          {/* Engagement Tracker (Always Visible) */}
                          <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                             <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Champ Engagement</p>
                                {!order.assignedScrapChampId && order.status === 'Requested' && (
                                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                                     <CountdownTimer createdAt={order.createdAt} onExpire={() => fetchData()} />
                                  </p>
                                )}
                             </div>
                             <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                   <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-blue-100" title="Notified">
                                      {order.notifiedChampsCount || 0}
                                   </div>
                                   <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-red-100" title="Declined">
                                      {order.declinedChampIds?.length || 0}
                                   </div>
                                </div>
                                <button 
                                  onClick={() => fetchEngagement(order._id)}
                                  className="px-4 py-2 bg-white rounded-xl border border-gray-200 text-[10px] font-black text-gray-600 uppercase tracking-widest shadow-sm hover:border-brand-500 hover:text-brand-500 transition-all flex items-center justify-center gap-2"
                                >
                                  <span>Engagement View</span>
                                </button>
                             </div>
                          </div>

                          {/* Allocation Section */}
                          <div className="space-y-2">
                             <div className="px-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Allocation Status</p>
                             </div>
                             {order.assignedScrapChampId ? (
                                <div className="flex items-center justify-between bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                                   <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-xs border border-white">
                                         {order.champDetails?.name?.charAt(0) || <User size={12} />}
                                      </div>
                                      <div className="flex flex-col">
                                         <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest leading-none mb-1">Partner Assigned</p>
                                         <p className="text-xs font-bold text-gray-800">{order.champDetails?.name || 'Partner'}</p>
                                      </div>
                                   </div>
                                   <StatusBadge status={order.status} />
                                </div>
                             ) : (
                                <div className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between">
                                   <div className="flex items-center gap-2">
                                      <Radio size={16} className="text-blue-500 animate-pulse" />
                                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Broadcasting Region...</span>
                                   </div>
                                   <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
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
                        <th className="px-4 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Status / Allocation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {orders.length === 0 ? (
                         <tr>
                           <td colSpan={5} className="py-20 text-center">
                              <div className="flex flex-col items-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-[1.5rem] flex items-center justify-center text-gray-200 mb-4 border border-gray-100">
                                  <Inbox size={40} />
                                </div>
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Queue Clear</p>
                              </div>
                           </td>
                         </tr>
                       ) : (
                         orders.map((order) => (
                          <tr key={order._id} className="hover:bg-gray-50/30 transition-colors group">
                            <td className="px-4 py-6">
                               <Link href={`/admin/orders/${order._id}`} className="group/link block">
                                 <p className="font-black text-gray-900 group-hover/link:text-brand-600 transition-colors tracking-tight text-base mb-1 truncate max-w-[150px]">{order.scrapTypes.join(', ')}</p>
                                 <p className="text-[10px] text-gray-400 font-black flex items-center gap-1.5 uppercase tracking-widest">
                                   <ArrowRight size={10} className="text-brand-500 flex-shrink-0" />
                                   <span className="truncate">{new Date(order.scheduledAt).toLocaleDateString()} @ {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                              {order.assignedScrapChampId ? (
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 font-black text-xs border border-emerald-100 shadow-sm flex-shrink-0">
                                     {order.champDetails?.name?.charAt(0) || <User size={16} />}
                                   </div>
                                   <div className="min-w-0 max-w-[150px]">
                                     <p className="text-xs font-black text-gray-900 leading-none mb-1.5 truncate">{order.champDetails?.name || 'Partner'}</p>
                                     <StatusBadge status={order.status} />
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
                                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none truncate">Broadcasting</span>
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
    </ProtectedRoute>
  );
}
