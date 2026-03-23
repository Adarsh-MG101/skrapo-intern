'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, Loader, Button, EmptyState, DateTimePicker } from '../../components/common';
import Link from 'next/link';
import { API_URL } from '../../config/env';
import { 
  ScrollText, 
  MapPin, 
  Star, 
  History as HistoryIcon, 
  ArrowRight,
  Search,
  RefreshCw
} from 'lucide-react';

interface Job {
  _id: string;
  scrapTypes: string[];
  scheduledAt: string;
  status: string;
  customer: {
    name: string;
    mobileNumber: string;
  };
  exactAddress?: string;
  feedback?: {
    rating: number;
    comments?: string;
  };
}

export default function ScrapChampHistoryPage() {
  const { token } = useAuth();
  const [history, setHistory] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, fromDate, toDate]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/scrap-champ/history`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          setHistory(data);
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchHistory();
  }, [token]);

  // Combined Filtering Logic
  const filteredHistory = history.filter(job => {
    const matchesSearch = job.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.scrapTypes.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const jobDate = new Date(job.scheduledAt);
    
    let matchesDate = true;
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && jobDate >= from;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && jobDate <= to;
    }
    
    return matchesSearch && matchesDate;
  });

  // Pagination logic on filtered data
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

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
    <ProtectedRoute allowedRoles={['scrapChamp']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                <HistoryIcon size={32} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mission History</h1>
                <p className="text-sm text-gray-500 font-medium tracking-tight">Review your past assignments and performance logs.</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : history.length === 0 ? (
            <EmptyState 
              title="No History Yet" 
              description="Complete your first assignment to see your collection log here!"
              icon={ScrollText}
            />
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
                    placeholder="Search customer or scrap..." 
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
                  <p className="text-gray-400 font-bold italic text-sm tracking-tight">No missions match your selected filters.</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-3">
                    {currentItems.map((job) => (
                      <div key={job._id} className="bg-white rounded-xl px-4 py-3 sm:px-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-100 transition-all animate-fade-in group flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 relative">
                        {/* Status Badge - PC (pinned far right) */}
                        <div className="hidden sm:block absolute right-6 top-1/2 -translate-y-1/2">
                          <StatusBadge status={job.status} />
                        </div>

                        <div className="flex-1 min-w-0 flex items-center gap-3.5 sm:pr-32">
                           <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 flex-shrink-0">
                              <HistoryIcon size={18} />
                           </div>
                           <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-black text-gray-900 truncate">
                                {job.scrapTypes.join(', ')}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                 <div className="flex items-center gap-1 min-w-0 max-w-full sm:max-w-[300px]">
                                   <MapPin size={10} className="text-gray-300 flex-shrink-0" />
                                   <p className="text-[11px] text-gray-400 font-medium truncate" title={job.exactAddress}>
                                     {job.customer.name} · {job.exactAddress || 'Regional Area'}
                                   </p>
                                 </div>
                                 <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider whitespace-nowrap">
                                   {new Date(job.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                 </p>
                                 {job.feedback && (
                                   <div className="flex items-center gap-1 text-amber-500">
                                     <Star size={10} className="fill-current" />
                                     <span className="text-[10px] font-black">{job.feedback.rating}</span>
                                   </div>
                                 )}
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-5 sm:pr-32">
                           {/* Status Badge - Phone (bottom left) */}
                           <div className="sm:hidden flex-shrink-0">
                              <StatusBadge status={job.status} />
                           </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <Link href={`/scrap-champ/orders/${job._id}`} className="ml-auto w-full sm:w-auto">
                                 <Button 
                                    variant={job.status === 'Completed' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="rounded-xl px-4 py-3 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-gray-100 group-hover:border-brand-100"
                                 >
                                    {job.status === 'Completed' ? 'Receipt' : 'Review Mission'} 
                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                 </Button>
                              </Link>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
