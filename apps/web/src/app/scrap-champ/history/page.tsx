'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, Loader, Button, EmptyState } from '../../components/common';
import Link from 'next/link';
import { API_URL } from '../../config/env';
import { 
  ScrollText, 
  User, 
  MapPin, 
  Star, 
  History as HistoryIcon, 
  ArrowRight,
  ChevronRight,
  FileCheck
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
          <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                <HistoryIcon size={32} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mission History</h1>
                <p className="text-sm text-gray-500 font-medium tracking-tight">Review your past assignments and performance logs.</p>
              </div>
            </div>
            <div className="bg-white px-8 py-4 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col items-center">
               <span className="text-[10px] font-black uppercase text-gray-400 block tracking-[0.2em] mb-1">Total Logs</span>
               <span className="text-3xl font-black text-brand-600 tracking-tighter">{history.length}</span>
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
            <div className="grid gap-6">
              {history.map((job) => (
                <div key={job._id} className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 animate-fade-in group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5 text-brand-600 group-hover:scale-110 transition-transform duration-700">
                     <FileCheck size={120} />
                  </div>

                  <div className="flex flex-col lg:flex-row justify-between gap-8 md:gap-10 relative z-10">
                    <div className="flex gap-6 md:gap-10 flex-1">
                      {/* Date Indicator */}
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-50 rounded-[2rem] flex flex-col items-center justify-center text-gray-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-all flex-shrink-0 border border-gray-100 group-hover:border-brand-100 shadow-inner group-hover:scale-105">
                        <span className="text-[10px] md:text-sm font-black uppercase leading-none mb-1 md:mb-1.5 tracking-widest">
                          {new Date(job.scheduledAt).toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="text-2xl md:text-4xl font-black leading-none tracking-tighter">
                          {new Date(job.scheduledAt).getDate()}
                        </span>
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <h3 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">
                             {job.scrapTypes.join(', ')}
                          </h3>
                          <StatusBadge status={job.status} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-brand-600 flex-shrink-0 border border-white shadow-sm">
                                <User size={18} />
                             </div>
                             <div>
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">Customer Name</p>
                               <p className="text-sm font-bold text-gray-800 tracking-tight">{job.customer.name}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-brand-600 flex-shrink-0 border border-white shadow-sm">
                                <MapPin size={18} />
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">Collection Point</p>
                               <p className="text-sm font-bold text-gray-600 truncate tracking-tight" title={job.exactAddress}>{job.exactAddress || 'Address Restricted'}</p>
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col justify-center gap-4 lg:w-56">
                        {job.feedback ? (
                           <div className="bg-brand-50/50 p-5 rounded-[1.5rem] border border-brand-100 flex-1 group/rating hover:bg-white transition-all shadow-inner">
                              <div className="flex items-center gap-1.5 mb-2 text-amber-500">
                                 {[...Array(5)].map((_, i) => (
                                   <Star key={i} size={14} className={i < job.feedback!.rating ? 'fill-current' : 'text-gray-200'} strokeWidth={3} />
                                 ))}
                                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-700 ml-2">Rating</span>
                              </div>
                              <p className="text-[11px] text-gray-500 font-medium italic leading-relaxed line-clamp-3">
                                 "{job.feedback.comments || 'Excellent service provided.'}"
                              </p>
                           </div>
                        ) : (
                           <div className="p-5 rounded-[1.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center flex-1 bg-gray-50/20">
                              <span className="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]">Awaiting Review</span>
                           </div>
                        )}
                        
                        <div className="lg:w-full">
                          <Link href={`/scrap-champ/orders/${job._id}`}>
                            <Button variant="ghost" fullWidth size="lg" className="py-5 rounded-xl flex gap-2 font-black text-[11px] uppercase tracking-widest hover:bg-brand-50 hover:text-brand-700">
                               Receipt Details <ArrowRight size={16} />
                            </Button>
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
