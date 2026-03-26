'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, Loader, DateTimePicker, CustomSelect } from '../../components/common';
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
  const itemsPerPage = 10;

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
          <div className="bg-white rounded-2xl p-2.5 mb-8 border border-gray-100 shadow-lg shadow-brand-500/5 flex flex-col gap-2.5 max-w-6xl mx-auto w-full relative">
             <div className="flex items-center justify-between px-1 mb-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filter Records</p>
                <div className="flex items-center gap-2">
                   <span className="px-2 py-0.5 bg-brand-50 text-brand-600 rounded-md text-[9px] font-black uppercase tracking-tighter">
                      {filteredOrders.length} Records Found
                   </span>
                </div>
             </div>
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
                  <CustomSelect 
                    size="sm"
                    options={statuses.map(s => ({ label: s, value: s }))}
                    value={status}
                    onChange={(val: string) => setStatus(val)}
                    placeholder="All Status"
                  />
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
              
              {/* Unified Table View */}
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Order Information</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Customer & Contact</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Location</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Scheduled Time</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Assigned Champ</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {currentItems.map((order) => {
                        const isExpired = order.status === 'Requested' && (new Date(order.createdAt).getTime() + 30 * 60 * 1000 <= Date.now());
                        const displayStatus = isExpired ? 'Expired' : order.status;

                        return (
                          <tr key={order._id} className="hover:bg-gray-50/30 transition-all group border-b border-gray-50 last:border-0">
                            <td className="px-6 py-5 whitespace-nowrap">
                               <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-brand-600 uppercase tracking-wider mb-1">ID: {order._id.slice(-6).toUpperCase()}</span>
                                  <span className="text-xs font-black text-gray-900 truncate max-w-[120px]">{order.scrapTypes.join(', ')}</span>
                                  <span className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Placed: {new Date(order.createdAt).toLocaleDateString()}</span>
                               </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                               <div className="flex flex-col">
                                  <p className="font-black text-gray-900 mb-0.5 text-sm">{order.customerDetails?.name || 'User'}</p>
                                  <p className="text-[10px] text-brand-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                     <Phone size={10} className="text-brand-500 shrink-0" /> {order.customerDetails?.mobileNumber || 'N/A'}
                                  </p>
                               </div>
                            </td>
                            <td className="px-6 py-5 max-w-[200px]">
                               <p className="text-[10px] text-gray-500 font-bold leading-tight line-clamp-2" title={order.exactAddress}>
                                  {order.exactAddress}
                               </p>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                               <div className="flex flex-col">
                                  <p className="text-[10px] font-black text-gray-900 flex items-center gap-2 mb-1">
                                     <Calendar size={12} className="text-gray-400" />
                                     {new Date(order.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </p>
                                   <p className="text-[9px] text-brand-600 font-black uppercase tracking-widest flex items-center gap-2">
                                      <Clock size={12} className="text-brand-500" />
                                      {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : 'N/A'}
                                   </p>
                               </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              {order.champDetails ? (
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center text-brand-700 font-black text-[10px] ring-4 ring-brand-50 ring-inset shadow-inner border border-white flex-shrink-0">
                                    {order.champDetails.name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                     <p className="text-[11px] font-black text-gray-900 truncate">{order.champDetails.name}</p>
                                     <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Partner</p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest italic opacity-60">Unassigned</span>
                              )}
                            </td>
                            <td className="px-6 py-5 text-center">
                              <div className="inline-block transform scale-90">
                                <StatusBadge status={displayStatus} />
                              </div>
                            </td>
                            <td className="px-6 py-5">
                               <div className="flex items-center justify-center gap-2">
                                  <Link href={`/admin/history/${order._id}`}>
                                     <button className="px-4 py-2 bg-gray-900 text-white hover:bg-black text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-gray-200 transition-all active:scale-95 whitespace-nowrap flex items-center gap-2">
                                        Details
                                     </button>
                                  </Link>
                                  {displayStatus === 'Assigned' || displayStatus === 'Accepted' || displayStatus === 'Arriving' || displayStatus === 'Arrived' || displayStatus === 'Picking' ? (
                                    <Link href={`/admin/orders/track?id=${order._id}`}>
                                      <button className="px-4 py-2 border-2 border-brand-500 text-brand-600 hover:bg-brand-50 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 whitespace-nowrap">
                                        Track
                                      </button>
                                    </Link>
                                  ) : null}
                               </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
