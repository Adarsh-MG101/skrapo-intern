'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, Loader, DateTimePicker } from '../../components/common';
import { getTimeSlotLabel } from '../../utils/dateTime';
import Link from 'next/link';
import { Search, Printer, RefreshCw, User, Phone, Calendar, Clock, Inbox, ArrowRight, History as HistoryIcon } from 'lucide-react';

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
      setCurrentPage(1); // Reset page on filter change
      fetchOrders();
    }
  }, [status, startDate, endDate, isLoading, isAuthenticated, apiFetch]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const resetFilters = () => {
    setStatus('All');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setCurrentPage(1);
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
      matchesStatus = true; // Show everything for 'All'
    } else if (status === 'Active') {
      matchesStatus = ['Requested', 'Assigned', 'Accepted', 'Arrived', 'Arriving', 'Picking', 'Problem'].includes(displayStatus);
    } else {
      matchesStatus = displayStatus === status;
    }
    
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
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

  const statuses = ['All', 'Active', 'Completed', 'Cancelled', 'Expired', 'Problem'];

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-full">
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter mb-1 flex items-center gap-3 flex-wrap">
                 Order Records <HistoryIcon size={24} className="text-brand-600 shrink-0" />
              </h1>
              <p className="text-gray-500 font-medium text-sm leading-relaxed max-w-md">Review activity and collection logs across the platform.</p>
            </div>
            
            <button 
                onClick={() => window.print()}
                className="hidden sm:flex items-center gap-3 px-6 py-3.5 bg-gray-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 transition-all active:scale-95 shrink-0"
            >
                <Printer size={16} /> Export PDF
            </button>
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
                    placeholder="Search name, mobile, address..." 
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
                      {currentItems.map((order) => (
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
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {currentItems.map((order) => (
                  <div key={order._id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-lg shadow-brand-500/5 space-y-4">
                    <div className="flex justify-between items-start gap-4">
                       <div className="min-w-0">
                          <p className="text-[9px] text-brand-600 font-black uppercase tracking-widest mb-1 flex items-center gap-1.5 leading-none">
                             <span className="w-1.5 h-1.5 bg-brand-500 rounded-full shrink-0" />
                             ORDER #{order._id.slice(-6).toUpperCase()}
                          </p>
                          <h3 className="font-black text-gray-900 text-base tracking-tight leading-tight truncate">{order.scrapTypes.join(', ')}</h3>
                       </div>
                       <div className="shrink-0">
                          <StatusBadge status={(order.status === 'Requested' && (new Date(order.createdAt).getTime() + 30 * 60 * 1000 <= Date.now())) ? 'Expired' : order.status} />
                       </div>
                    </div>

                    <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-50 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm shrink-0">
                           <User size={16} />
                        </div>
                        <div className="min-w-0">
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5 leading-none">Customer</p>
                           <p className="text-sm font-black text-gray-900 truncate leading-none">{order.customerDetails?.name || 'User'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                          <div>
                             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Schedule</p>
                             <p className="text-[11px] font-black text-gray-900 leading-none">
                                {new Date(order.scheduledAt).toLocaleDateString()}
                             </p>
                          </div>
                          <div className="text-right">
                             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Window</p>
                             <p className="text-[11px] font-black text-brand-600 leading-none">
                                {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : 'N/A'}
                             </p>
                          </div>
                      </div>
                    </div>

                    <div className="pt-1">
                       <Link 
                          href={`/admin/history/${order._id}`}
                          className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-gray-200 active:scale-95 transition-all hover:bg-brand-600"
                       >
                          View Details <ArrowRight size={12} />
                       </Link>
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
