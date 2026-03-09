'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { StatusBadge, Loader } from '../../components/common';
import { getTimeSlotLabel } from '../../utils/dateTime';
import Link from 'next/link';
import { User, MapPin, Inbox, Zap, ArrowRight, Radio } from 'lucide-react';

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
  champDetails?: {
    name: string;
  };
}


export default function AdminOrdersPage() {
  const { apiFetch } = useAuth();
  const { socket } = useSocket();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await apiFetch('/orders/admin');
      if (res.ok) {
        const allOrders: Order[] = await res.json();
        const pendingOrders = allOrders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled');
        setOrders(pendingOrders);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiFetch]);

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

    return () => {
      socket.off('new_pickup_request', handleRefresh);
      socket.off('pickup_cancelled', handleRefresh);
      socket.off('order_accepted', handleRefresh);
      socket.off('order_declined', handleRefresh);
      socket.off('order_completed', handleRefresh);
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
                {orders.map((order) => (
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

                    <div className="pt-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Broadcast Status</p>
                        {order.assignedScrapChampId ? (
                          <div className="flex items-center justify-between bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                             <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-xs border border-white">
                                   {order.champDetails?.name?.charAt(0) || <User size={12} />}
                                </div>
                                <p className="text-xs font-bold text-gray-800">{order.champDetails?.name || 'Partner'}</p>
                             </div>
                             <StatusBadge status={order.status} />
                          </div>
                        ) : (
                          <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 flex justify-between items-center">
                             <div className="flex gap-4">
                                <div className="text-center">
                                   <p className="text-[9px] font-black text-blue-500 uppercase tracking-tight">Notified</p>
                                   <p className="text-sm font-black text-gray-900">{order.notifiedChampsCount || 0}</p>
                                </div>
                                <div className="text-center">
                                   <p className="text-[9px] font-black text-amber-500 uppercase tracking-tight">Views</p>
                                   <p className="text-sm font-black text-gray-900">{order.viewCount || 0}</p>
                                </div>
                                <div className="text-center">
                                   <p className="text-[9px] font-black text-red-500 uppercase tracking-tight">Declined</p>
                                   <p className="text-sm font-black text-gray-900">{order.declinedChampIds?.length || 0}</p>
                                </div>
                             </div>
                             <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-10 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Order Info</th>
                        <th className="px-10 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Customer</th>
                        <th className="px-10 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Address</th>
                        <th className="px-10 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Engagement</th>
                        <th className="px-10 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Status / Allocation</th>
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
                            <td className="px-10 py-8">
                               <Link href={`/admin/orders/${order._id}`} className="group/link block">
                                 <p className="font-black text-gray-900 group-hover/link:text-brand-600 transition-colors tracking-tight text-base mb-1">{order.scrapTypes.join(', ')}</p>
                                 <p className="text-[10px] text-gray-400 font-black flex items-center gap-1.5 uppercase tracking-widest">
                                   <ArrowRight size={10} className="text-brand-500" />
                                   {new Date(order.scheduledAt).toLocaleDateString()} @ {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </p>
                               </Link>
                            </td>
                            <td className="px-10 py-8">
                              <div className="flex items-center gap-3">
                                 <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 border border-brand-100"><User size={18} /></div>
                                 <div className="min-w-0">
                                   <p className="font-black text-gray-900 leading-tight truncate">{order.customerDetails?.name || 'Deleted User'}</p>
                                   <p className="text-[10px] text-brand-600 font-bold tracking-wider mt-0.5">{order.customerDetails?.mobileNumber || 'N/A'}</p>
                                 </div>
                              </div>
                            </td>
                            <td className="px-10 py-8 max-w-[240px]">
                              <p className="text-[13px] text-gray-500 font-medium truncate group-hover:text-gray-900 transition-colors" title={order.exactAddress}>
                                {order.exactAddress}
                              </p>
                            </td>
                            <td className="px-10 py-8">
                               <div className="flex justify-center gap-3">
                                  <div className="px-3 py-1.5 bg-blue-50 rounded-lg text-blue-600 text-[10px] font-black uppercase tracking-tight shadow-sm border border-blue-100" title="Notified">
                                     {order.notifiedChampsCount || 0}N
                                  </div>
                                  <div className="px-3 py-1.5 bg-amber-50 rounded-lg text-amber-600 text-[10px] font-black uppercase tracking-tight shadow-sm border border-amber-100" title="Views">
                                     {order.viewCount || 0}V
                                  </div>
                                  <div className="px-3 py-1.5 bg-red-50 rounded-lg text-red-600 text-[10px] font-black uppercase tracking-tight shadow-sm border border-red-100" title="Declined">
                                     {order.declinedChampIds?.length || 0}D
                                  </div>
                               </div>
                            </td>
                            <td className="px-10 py-8">
                              {order.assignedScrapChampId ? (
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 font-black text-xs border border-emerald-100 shadow-sm">
                                     {order.champDetails?.name?.charAt(0) || <User size={16} />}
                                   </div>
                                   <div>
                                     <p className="text-xs font-black text-gray-900 leading-none mb-1.5">{order.champDetails?.name || 'Partner'}</p>
                                     <StatusBadge status={order.status} />
                                   </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-4">
                                   <div className="relative">
                                      <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-500 border border-gray-100 shadow-inner">
                                         <Radio size={20} className="animate-pulse" />
                                      </div>
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Broadcasting</span>
                                      <span className="text-[10px] font-bold text-blue-600 mt-1.5 flex items-center gap-1.5">
                                         Live Now <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
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
    </ProtectedRoute>
  );
}
