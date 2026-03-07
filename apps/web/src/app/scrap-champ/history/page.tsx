'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, Loader, Button, EmptyState } from '../../components/common';
import Link from 'next/link';
import { API_URL } from '../../config/env';

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

  return (
    <ProtectedRoute allowedRoles={['scrapChamp']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 md:mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Job History</h1>
              <p className="text-xs md:text-sm text-gray-500 font-medium">Review your past assignments and performance.</p>
            </div>
            <div className="bg-white px-5 md:px-6 py-2 md:py-3 rounded-2xl shadow-sm border border-gray-100 flex sm:block items-center gap-3">
               <span className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 block tracking-widest leading-none sm:mb-1">Total Jobs</span>
               <span className="text-lg md:text-xl font-black text-brand-600">{history.length}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : history.length === 0 ? (
            <EmptyState 
              title="No History Yet" 
              description="Complete your first assignment to see it here!"
              icon="📜"
            />
          ) : (
            <div className="grid gap-6">
              {history.map((job) => (
                <div key={job._id} className="bg-white rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all animate-fade-in group">
                  <div className="flex flex-col lg:flex-row justify-between gap-6 md:gap-8">
                    <div className="flex gap-4 md:gap-6 flex-1">
                      {/* Date Indicator */}
                      <div className="w-14 h-14 md:w-20 md:h-20 bg-gray-50 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center text-gray-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors flex-shrink-0 border border-gray-100 group-hover:border-brand-100">
                        <span className="text-[8px] md:text-[10px] font-black uppercase leading-none mb-0.5 md:mb-1">
                          {new Date(job.scheduledAt).toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="text-xl md:text-3xl font-black leading-none">
                          {new Date(job.scheduledAt).getDate()}
                        </span>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 md:gap-3 mb-3 flex-wrap">
                          <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight">
                             {job.scrapTypes.join(', ')}
                          </h3>
                          <StatusBadge status={job.status} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                           <div className="flex items-center sm:items-start gap-2">
                             <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs md:text-sm flex-shrink-0">👤</div>
                             <div>
                               <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer</p>
                               <p className="text-xs md:text-sm font-bold text-gray-800">{job.customer.name}</p>
                             </div>
                           </div>
                           <div className="flex items-center sm:items-start gap-2">
                             <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs md:text-sm flex-shrink-0">📍</div>
                             <div className="flex-1 min-w-0">
                               <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Address</p>
                               <p className="text-xs md:text-sm font-bold text-gray-600 truncate" title={job.exactAddress}>{job.exactAddress || 'Restricted'}</p>
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col justify-center gap-3 md:gap-4 lg:w-48">
                        {job.feedback ? (
                           <div className="bg-brand-50/50 p-3 md:p-4 rounded-2xl border border-brand-100 flex-1">
                              <div className="flex items-center gap-1.5 mb-1 text-brand-600">
                                 {[...Array(5)].map((_, i) => (
                                   <svg key={i} className={`w-3 h-3 md:w-3.5 md:h-3.5 ${i < job.feedback!.rating ? 'fill-current' : 'text-gray-200'}`} viewBox="0 0 24 24">
                                     <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                   </svg>
                                 ))}
                                 <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest ml-1">Rating</span>
                              </div>
                              <p className="text-[10px] md:text-[11px] text-gray-500 font-medium italic leading-tight line-clamp-2 md:truncate">
                                "{job.feedback.comments || 'No comment'}"
                              </p>
                           </div>
                        ) : (
                           <div className="p-3 md:p-4 rounded-2xl border border-dashed border-gray-100 flex flex-col items-center justify-center flex-1">
                              <span className="text-[9px] md:text-[10px] font-black uppercase text-gray-300 tracking-widest">Awaiting Feedback</span>
                           </div>
                        )}
                        
                        <div className="lg:w-full">
                          <Link href={`/scrap-champ/orders/${job._id}`}>
                            <Button variant="ghost" fullWidth size="sm" className="py-3 sm:py-2">View Receipt</Button>
                          </Link>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
