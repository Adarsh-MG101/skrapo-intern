'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/common/Toast';
import { StatusBadge, Loader, Button, EmptyState } from '../../components/common';
import { getTimeSlotLabel } from '../../utils/dateTime';
import Link from 'next/link';

interface Order {
  _id: string;
  scrapTypes: string[];
  scheduledAt: string;
  timeSlot?: string;
  status: string;
  generalArea: string;
  exactAddress?: string;
  location?: { lat: number, lng: number };
  createdAt: string;
}

export default function ScrapChampJobsPage() {
  const { apiFetch, user } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [acceptedByOthers, setAcceptedByOthers] = useState<Record<string, string>>({});

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const [myRes, availRes] = await Promise.all([
        apiFetch('/orders/scrap-champ/my-jobs'),
        apiFetch('/orders/scrap-champ/available-jobs')
      ]);

      if (myRes.ok && availRes.ok) {
        const myJobs = await myRes.json();
        const availableJobs = await availRes.json();
        
        // Merge and sort: Accepted first, then Requested
        const combined = [...myJobs, ...availableJobs].sort((a, b) => {
          if (a.status === 'Accepted' && b.status !== 'Accepted') return -1;
          if (a.status !== 'Accepted' && b.status === 'Accepted') return 1;
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        });
        
        setJobs(combined);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id: string, decision: 'accept' | 'deny') => {
    setProcessingId(id);
    try {
      const res = await apiFetch(`/orders/scrap-champ/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(decision === 'accept' ? 'Assignment Accepted!' : 'Assignment Declined.', 'success');
        fetchJobs();
      } else {
        showToast(data.error || 'Decision failed', 'error');
        fetchJobs(); // Refresh in case another champion claimed it
      }
    } catch (err) {
      showToast('Network error', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [apiFetch]);

  useEffect(() => {
    if (!socket) return;

    const handleRefresh = () => {
      console.log('🔄 [Jobs Board] Refreshing via socket');
      fetchJobs();
    };

    socket.on('new_job_assigned', handleRefresh);
    socket.on('new_available_job', handleRefresh);
    
    // Instead of completely refreshing the list, update local state to gray it out
    const handleAcceptedByOther = (data: any) => {
      // If the accepted event was NOT by the current logged-in champ
      if (user?.id && data.acceptedByUserId !== user.id) {
        setAcceptedByOthers(prev => ({ ...prev, [data.orderId]: data.champName }));
      }
    };
    
    socket.on('order_accepted_by_other', handleAcceptedByOther);
    
    return () => {
      socket.off('new_job_assigned', handleRefresh);
      socket.off('new_available_job', handleRefresh);
      socket.off('order_accepted_by_other', handleAcceptedByOther);
    };
  }, [socket, user]);

  return (
    <ProtectedRoute allowedRoles={['scrapChamp']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 md:mb-10">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-1 md:mb-2 text-center md:text-left">
              Current Missions
            </h1>
            <p className="text-xs md:text-sm text-gray-500 font-medium text-center md:text-left">
              Your assigned pickups and local pool requests, all in one place.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState 
              title="No Missions" 
              description="You have no assigned jobs or local pickup requests right now. We'll notify you via SMS when something new drops."
              icon="🔍"
            />
          ) : (
            <div className="grid gap-6">
              {jobs.map((job) => {
                const isAcceptedByOther = acceptedByOthers[job._id];
                return (
                  <div key={job._id} className={`bg-white rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 shadow-sm border ${isAcceptedByOther ? 'border-gray-200 opacity-60 pointer-events-none' : 'border-gray-100 hover:shadow-xl'} transition-all animate-fade-in relative overflow-hidden group`}>
                    {isAcceptedByOther && (
                      <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4">
                        <div className="bg-gray-900 text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl font-black shadow-2xl text-center transform -rotate-2 border-2 md:border-4 border-gray-800">
                          🚫 CLAIMED
                          <p className="text-[8px] md:text-[10px] font-bold text-brand-300 mt-1 tracking-widest uppercase">Accepted by {isAcceptedByOther}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col lg:flex-row justify-between gap-6 md:gap-8 lg:items-center">
                      <div className="flex items-start gap-4 md:gap-6 flex-1">
                        <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center border-2 transition-transform group-hover:scale-105 bg-brand-50 border-brand-100 text-brand-600">
                          <span className="text-[8px] md:text-[10px] font-black uppercase leading-none tracking-widest mb-0.5 md:mb-1">
                            {new Date(job.scheduledAt).toLocaleString('default', { month: 'short' })}
                          </span>
                          <span className="text-xl md:text-3xl font-black leading-none">
                            {new Date(job.scheduledAt).getDate()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg md:text-xl font-black text-gray-900 group-hover:text-brand-600 transition-colors leading-tight">
                              {job.scrapTypes.join(', ')}
                            </h3>
                            <StatusBadge status={job.status} />
                          </div>
                          <p className="text-sm md:text-base text-gray-500 font-medium flex items-start gap-2 mb-4">
                            <span className="text-gray-300 flex-shrink-0">📍</span>
                            <span className="line-clamp-2 md:line-clamp-none">
                              {job.status === 'Accepted' || job.status === 'Completed' 
                                ? job.exactAddress 
                                : job.generalArea + ' (Regional Request)'}
                            </span>
                          </p>
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="px-3 md:px-4 py-1.5 bg-gray-50 rounded-full text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                              <span className="text-base md:text-lg leading-none mt-[-2px]">⏰</span> 
                              {job.timeSlot ? getTimeSlotLabel(job.timeSlot) : new Date(job.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6 lg:mt-0">
                         {job.status === 'Accepted' && (
                           <Button 
                             variant="ghost" 
                             className="flex-1 sm:flex-none flex justify-center items-center gap-2 border-emerald-100 text-emerald-600 hover:bg-emerald-50 px-4 md:px-6 py-3.5 md:py-4 rounded-2xl font-black text-[9px] md:text-[11px] uppercase tracking-widest shadow-sm"
                             onClick={(e) => {
                               e.preventDefault();
                               const dest = job.location 
                                 ? `${job.location.lat},${job.location.lng}` 
                                 : encodeURIComponent(job.exactAddress || "");
                               window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                             }}
                           >
                             Navigate
                           </Button>
                         )}
                         
                         {job.status === 'Requested' ? (
                            <div className="flex gap-2 flex-1 sm:flex-none">
                               <Button 
                                 variant="primary" 
                                 onClick={() => handleDecision(job._id, 'accept')}
                                 disabled={processingId === job._id}
                                 className="px-4 md:px-6 py-3.5 md:py-4 rounded-2xl font-black text-[9px] md:text-[11px] uppercase tracking-widest shadow-xl transition-all bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 flex-1"
                               >
                                  {processingId === job._id ? '...' : '⚡ Accept'}
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 onClick={() => handleDecision(job._id, 'deny')}
                                 disabled={processingId === job._id}
                                 className="px-4 md:px-6 py-3.5 md:py-4 rounded-2xl font-black text-[9px] md:text-[11px] uppercase tracking-widest transition-all border border-gray-100 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-100 flex-1 sm:flex-none min-w-[60px] md:min-w-[80px]"
                               >
                                  {processingId === job._id ? '...' : 'Pass'}
                               </Button>
                            </div>
                         ) : (
                           <div className="flex-1 lg:w-48">
                             <Link href={`/scrap-champ/orders/${job._id}`} className="block">
                               <Button 
                                  variant="ghost" 
                                  fullWidth
                                  className="px-4 md:px-10 py-3.5 md:py-4 rounded-2xl font-black text-[9px] md:text-[11px] uppercase tracking-widest shadow-xl transition-all border border-gray-100 hover:bg-brand-50 hover:text-brand-600 bg-white"
                               >
                                  View Mission
                               </Button>
                             </Link>
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
