'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { Loader, EmptyState, DateTimePicker } from '../../components/common';
import Link from 'next/link';
import { Star, MessageSquare, ArrowRight, Search, RefreshCw } from 'lucide-react';

export default function AdminFeedbackPage() {
  const { apiFetch, isLoading, isAuthenticated } = useAuth();
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, fromDate, toDate]);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await apiFetch('/feedback/admin');
        if (res.ok) {
          const data = await res.json();
          setFeedback(data);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (!isLoading && isAuthenticated) {
      fetchFeedback();
    }
  }, [isLoading, isAuthenticated, apiFetch]);

  // Combined Filtering Logic
  const filteredFeedback = feedback.filter(f => {
    const matchesSearch = f.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const feedbackDate = new Date(f.createdAt);
    
    let matchesDate = true;
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && feedbackDate >= from;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && feedbackDate <= to;
    }
    
    return matchesSearch && matchesDate;
  });

  // Pagination logic on filtered data
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredFeedback.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage);

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

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                 Feedback Reports <Star className="text-amber-500 fill-amber-500" size={32} />
              </h1>
              <p className="text-gray-500 font-medium mt-1">Analyze service quality and customer sentiment across the platform.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : feedback.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] py-20 border border-gray-100 shadow-sm">
                <EmptyState 
                    title="No Feedback Yet" 
                    description="Feedback reports will appear here once customers complete their ratings." 
                    icon={MessageSquare}
                />
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in max-w-5xl mx-auto">
              {/* Ultra-Compact Filter Bar (Mobile Optimized) */}
              <div className="bg-white rounded-2xl p-2.5 border border-gray-100 shadow-lg shadow-brand-500/5 flex flex-col gap-2.5">
                {/* Search - Top Bar */}
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500 opacity-40">
                    <Search size={14} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search customer records..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-100 rounded-xl text-[11px] font-bold text-gray-700 outline-none focus:bg-white focus:border-brand-500/20 transition-all placeholder:text-gray-300"
                  />
                </div>

                {/* Date Selection Grid */}
                <div className="flex items-center gap-2">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <DateTimePicker 
                      label="From"
                      allowPastDates={true}
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                    <DateTimePicker 
                      label="To" 
                      allowPastDates={true}
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>

                  {/* Reset - Clean integration */}
                  <button 
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="w-9 h-9 flex-shrink-0 bg-gray-50 text-gray-400 rounded-xl hover:bg-brand-50 hover:text-brand-600 transition-all flex items-center justify-center border border-gray-100 active:scale-95"
                    title="Reset"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {currentItems.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
                  <p className="text-gray-400 font-bold italic text-sm tracking-tight">No feedback reports match your filters.</p>
                </div>
              ) : (
                <>
                  {currentItems.map((f) => (
                    <div key={f._id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center justify-between hover:border-brand-200 transition-all group active:scale-[0.99]">
                       <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-1 h-6 rounded-full flex-shrink-0 ${f.rating >= 4 ? 'bg-emerald-500' : f.rating >= 2.5 ? 'bg-amber-500' : 'bg-red-500'}`} />
                          <div className="min-w-0">
                             <h4 className="text-xs font-black text-gray-900 tracking-tight flex items-center gap-2 truncate uppercase">
                                {f.customer?.name}
                                <div className="flex gap-0.5 opacity-60">
                                   {[...Array(5)].map((_, i) => (
                                     <Star 
                                        key={i} 
                                        size={7} 
                                        className={`${i < f.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100'}`}
                                        strokeWidth={3}
                                     />
                                   ))}
                                </div>
                             </h4>
                             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                {new Date(f.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}, {new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </p>
                          </div>
                       </div>

                       <div className="flex items-center gap-3">
                          <Link href={`/admin/orders/${f.orderId}`}>
                            <button className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[8px] font-black text-gray-400 uppercase tracking-widest hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-all">
                               Inspect
                            </button>
                          </Link>
                       </div>
                    </div>
                  ))}
                </>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-8 pb-4 flex justify-center">
                  <div className="flex items-center justify-center gap-2 px-4">
                    <button 
                       onClick={() => paginate(currentPage - 1)}
                       disabled={currentPage === 1}
                       className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-brand-600 hover:border-brand-200 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:border-gray-100 transition-all shadow-sm"
                    >
                      <ArrowRight className="rotate-180" size={16} />
                    </button>
                    
                    {getPageNumbers().map((number) => (
                      <button
                         key={number}
                         onClick={() => paginate(number)}
                         className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl font-black text-xs transition-all shadow-sm ${currentPage === number ? 'bg-brand-600 text-white shadow-brand-500/20' : 'bg-white border border-gray-100 text-gray-500 hover:border-brand-200'}`}
                      >
                        {number}
                      </button>
                    ))}

                    <button 
                       onClick={() => paginate(currentPage + 1)}
                       disabled={currentPage === totalPages}
                       className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-brand-600 hover:border-brand-200 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:border-gray-100 transition-all shadow-sm"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
