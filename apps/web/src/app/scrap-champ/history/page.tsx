'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, Loader, EmptyState } from '../../components/common';
import Link from 'next/link';
import { API_URL } from '../../config/env';
import { 
  ScrollText, 
  MapPin, 
  Star, 
  History as HistoryIcon, 
  ArrowRight
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
               <span className="text-[10px] font-black uppercase text-gray-400 block tracking-[0.2em] mb-1 whitespace-nowrap">Total Jobs Completed</span>
               <span className="text-3xl font-black text-brand-600 tracking-tighter">
                 {history.filter(j => j.status === 'Completed').length}
               </span>
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
            <div className="grid gap-2">
              {history.map((job) => (
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
                        <Link href={`/scrap-champ/orders/${job._id}`} className="ml-auto">
                           <button className="text-[11px] font-black text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors uppercase tracking-widest">
                            Receipt <ArrowRight size={14} />
                           </button>
                        </Link>
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
