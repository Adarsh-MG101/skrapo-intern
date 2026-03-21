'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, Loader, DateTimePicker } from '../../components/common';
import { getTimeSlotLabel } from '../../utils/dateTime';
import Link from 'next/link';
import { Search, Printer, RefreshCw, User, Phone, Calendar, Clock, Inbox, ArrowRight } from 'lucide-react';

interface Order {
  _id: string;
  scrapTypes: string[];
  scheduledAt: string;
  timeSlot?: string;
  status: string;
  exactAddress: string;
  photoUrl?: string;
  maskReason?: string;
  estimatedWeight?: {
    total?: number;
  };
  customerDetails?: {
    name: string;
    mobileNumber: string;
  };
  assignedScrapChampId?: string | null;
  champDetails?: {
    name: string;
  };
  createdAt: string;
}

export default function AdminHistoryPage() {
  const { apiFetch, isLoading, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'All' && status !== 'Active') params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await apiFetch(`/orders/admin?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      fetchOrders();
    }
  }, [status, startDate, endDate, isLoading, isAuthenticated, apiFetch]);

  const resetFilters = () => {
    setStatus('All');
    setStartDate('');
    setEndDate('');
    setSearch('');
  };

  const filteredOrders = orders.filter(order => {
    const searchLow = search.toLowerCase();
    const matchesSearch = 
      (order.customerDetails?.name?.toLowerCase().includes(searchLow) || false) ||
      (order.customerDetails?.mobileNumber?.includes(searchLow) || false) ||
      order.exactAddress.toLowerCase().includes(searchLow) ||
      order.scrapTypes.some(t => t.toLowerCase().includes(searchLow));
    
    const isExpired = order.status === 'Requested' && (new Date(order.createdAt).getTime() + 30 * 60 * 1000 <= Date.now());
    const displayStatus = isExpired ? 'Expired' : order.status;

    let matchesStatus = true;
    if (status === 'All') {
      matchesStatus = !['Requested', 'Problem'].includes(displayStatus);
    } else if (status === 'Active') {
      matchesStatus = ['Requested', 'Assigned', 'Accepted', 'Arrived', 'Arriving', 'Picking', 'Problem'].includes(displayStatus);
    } else {
      matchesStatus = displayStatus === status;
    }
    
    return matchesSearch && matchesStatus;
  });

  const statuses = ['All', 'Active', 'Completed', 'Cancelled', 'Expired', 'Problem'];

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header & Main Search */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">Order Records</h1>
              <p className="text-gray-500 font-medium whitespace-nowrap">Manage and review all historical pickup data.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
               <div className="relative group w-full md:w-80">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-40 group-focus-within:opacity-100 transition-opacity">
                     <Search size={20} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search records..."
                    className="pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[2rem] text-sm font-bold shadow-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none w-full"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
               </div>
               <button 
                  onClick={() => window.print()}
                  className="hidden sm:flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 transition-all active:scale-95"
               >
                  <Printer size={16} /> Export PDF
               </button>
            </div>
          </div>

          {/* New Filter Bar */}
          <div className="bg-white rounded-[2.5rem] p-6 mb-10 border border-gray-100 shadow-xl shadow-gray-200/30 flex flex-col lg:flex-row items-end gap-8">
             {/* Simple Status Filter */}
             <div className="w-full lg:w-auto flex-1 h-full">
                <p className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Filter Status</p>
                <select 
                   className="w-full px-6 py-[0.875rem] bg-white border-2 border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none cursor-pointer shadow-sm hover:border-brand-200"
                   value={status}
                   onChange={(e) => setStatus(e.target.value)}
                >
                   {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>

             {/* Date Range Filters */}
             <div className="flex flex-col sm:flex-row items-end gap-6 w-full lg:w-auto h-full">
                <div className="w-full sm:w-64">
                   <DateTimePicker 
                      label="Start Date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                   />
                </div>
                <div className="w-full sm:w-64">
                   <DateTimePicker 
                      label="End Date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                   />
                </div>
                {/* Reset Button */}
                <div className="pb-[1.5px]">
                   <button 
                      onClick={resetFilters}
                      className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 hover:text-gray-700 transition-all flex items-center justify-center shadow-sm border border-transparent hover:border-gray-200 active:scale-95"
                      title="Clear All Filters"
                   >
                      <RefreshCw size={18} />
                   </button>
                </div>
             </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 animate-pulse">
              <Loader size="lg" />
              <p className="mt-6 text-sm font-bold text-gray-400 animate-fade-in uppercase tracking-[0.3em]">Gathering Records...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Customer & Address</th>
                        <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Pickup Time</th>
                        <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Assigned Champ</th>
                        <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Details</th>
                        <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredOrders.map((order) => (
                        <tr key={order._id} className="hover:bg-gray-50/30 transition-all group">
                          <td className="px-4 py-5 min-w-[200px] text-left">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 shadow-inner border border-white flex-shrink-0">
                                  <User size={24} />
                               </div>
                               <div className="min-w-0">
                                  <p className="font-black text-gray-900 mb-0.5 text-lg truncate">{order.customerDetails?.name || 'Deleted User'}</p>
                                  <p className="text-[11px] text-brand-600 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 truncate">
                                     <Phone size={12} className="text-brand-500 shrink-0" /> {order.customerDetails?.mobileNumber || 'N/A'}
                                  </p>
                                   <p className="text-[11px] text-gray-400 font-bold leading-tight max-w-[200px] truncate group-hover:text-gray-600 transition-colors" title={order.exactAddress}>
                                      {order.exactAddress}
                                   </p>
                                   <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-1 opacity-60">
                                      <Clock size={10} /> Placed: {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                   </p>
                                </div>
                            </div>
                          </td>
                          <td className="px-4 py-5 whitespace-nowrap text-left">
                             <div className="space-y-1.5 p-4 bg-gray-50/50 rounded-2xl border border-gray-50 group-hover:bg-white group-hover:border-gray-100 transition-all">
                                <p className="text-[11px] font-black text-gray-900 flex items-center gap-2">
                                   <Calendar size={14} className="text-gray-400" />
                                   {new Date(order.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                 <p className="text-[10px] text-brand-600 font-black uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={14} className="text-brand-500" />
                                    {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </p>
                              </div>
                          </td>
                          <td className="px-4 py-5 text-left min-w-[160px]">
                            {order.champDetails ? (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-700 font-black text-sm ring-4 ring-brand-50 ring-inset shadow-inner border border-white flex-shrink-0">
                                  {order.champDetails.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                   <p className="text-sm font-black text-gray-900 truncate">{order.champDetails.name}</p>
                                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Partner</p>
                                </div>
                              </div>
                            ) : order.assignedScrapChampId ? (
                              <div className="flex items-center gap-3 opacity-60">
                                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 font-bold text-sm flex-shrink-0">?</div>
                                <p className="text-xs font-bold text-gray-400 italic">No Reference</p>
                              </div>
                            ) : (
                              <div className="inline-flex items-center px-4 py-2 bg-gray-50 rounded-xl text-[10px] text-gray-400 font-black uppercase tracking-widest italic border border-dashed border-gray-200">
                                Unassigned
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-5 text-center">
                             <Link href={`/admin/history/${order._id}`}>
                                <button className="px-4 py-3 bg-gray-900 text-white hover:bg-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-gray-200 transition-all active:scale-95 whitespace-nowrap flex items-center gap-2 mx-auto">
                                   View Record <ArrowRight size={12} />
                                </button>
                             </Link>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <StatusBadge status={(order.status === 'Requested' && (new Date(order.createdAt).getTime() + 30 * 60 * 1000 <= Date.now())) ? 'Expired' : order.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View (Styled like table) */}
              <div className="grid grid-cols-1 gap-6 md:hidden">
                {filteredOrders.map((order) => (
                  <div key={order._id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">
                    <div className="flex justify-between items-start">
                       <div>
                          <p className="text-[10px] text-brand-600 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                             <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
                             ORDER #{order._id.slice(-6).toUpperCase()}
                          </p>
                          <p className="font-black text-gray-900 text-xl tracking-tight leading-none">{order.scrapTypes.join(', ')}</p>
                       </div>
                       <StatusBadge status={(order.status === 'Requested' && (new Date(order.createdAt).getTime() + 30 * 60 * 1000 <= Date.now())) ? 'Expired' : order.status} />
                    </div>

                    <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-50 space-y-4">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-gray-400 shadow-sm">
                             <User size={20} />
                          </div>
                          <div>
                             <p className="text-sm font-black text-gray-900">{order.customerDetails?.name || 'Deleted User'}</p>
                             <p className="text-[10px] font-bold text-gray-500">{order.customerDetails?.mobileNumber || 'N/A'}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4 border-t border-white pt-4">
                          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-brand-500 shadow-sm">
                             <Calendar size={20} />
                          </div>
                          <div>
                             <p className="text-sm font-black text-gray-900">
                                {new Date(order.scheduledAt).toLocaleDateString()}
                             </p>
                             <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">
                                {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </p>
                          </div>
                       </div>
                    </div>

                    <div className="pt-2">
                       <Link 
                          href={`/admin/history/${order._id}`}
                          className="flex items-center justify-center gap-3 w-full py-5 bg-gray-900 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-[1.5rem] shadow-2xl shadow-gray-200 active:scale-[0.98] transition-all"
                       >
                          View Full Details <ArrowRight size={14} />
                       </Link>
                    </div>
                  </div>
                ))}
              </div>

              {filteredOrders.length === 0 && (
                <div className="bg-white rounded-[3rem] py-24 text-center border border-gray-100 shadow-xl shadow-gray-100/50 flex flex-col items-center">
                   <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center text-gray-300 mb-8 border border-white">
                      <Inbox size={48} />
                   </div>
                   <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Zero Matches Found</h3>
                   <p className="text-gray-400 font-bold max-w-xs mx-auto">Try adjusting your filters or date range to find what you're looking for.</p>
                   <button 
                      onClick={resetFilters}
                      className="mt-8 px-10 py-4 border-2 border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all text-gray-500"
                   >
                      Reset Dashboard
                   </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
