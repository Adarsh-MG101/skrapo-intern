'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/common/Toast';
import { StatusBadge, Loader, Button, EmptyState } from '../../components/common';
import { getTimeSlotLabel } from '../../utils/dateTime';
import Link from 'next/link';
import { 
  MapPin, 
  Clock, 
  Zap, 
  Navigation, 
  XSquare, 
  ArrowRight, 
  Target, 
  Ban
} from 'lucide-react';

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
        fetchJobs(); 
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
      fetchJobs();
    };

    socket.on('new_job_assigned', handleRefresh);
    socket.on('new_available_job', handleRefresh);
    
    const handleAcceptedByOther = (data: any) => {
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
          <div className="mb-12 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 bg-brand-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-brand-500/20">
                  <Target size={32} strokeWidth={2.5} />
               </div>
               <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-2">Available Missions</h1>
                  <p className="text-sm text-gray-500 font-medium tracking-tight">Your assigned route and nearby pickup pool requests.</p>
               </div>
            </div>
            <div className="bg-brand-50 text-brand-600 px-6 py-3 rounded-2xl border border-brand-100 flex items-center gap-3 animate-pulse">
               <div className="w-2 h-2 bg-brand-500 rounded-full" />
               <span className="text-[10px] font-black uppercase tracking-widest leading-none">Scanning Network</span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState 
              title="No Missions Available" 
              description="You have no assigned jobs or local pickup requests right now. Relax, we'll ping you when something new drops."
              icon={Ban}
            />
          ) : (
            <div className="grid gap-8">
              {jobs.map((job) => {
                const isAcceptedByOther = acceptedByOthers[job._id];
                return (
                  <div key={job._id} className={`bg-white rounded-[2.5rem] p-6 md:p-10 shadow-sm border ${isAcceptedByOther ? 'border-gray-100 opacity-40 pointer-events-none' : 'border-gray-50 hover:shadow-2xl hover:-translate-y-1'} transition-all duration-300 animate-fade-in relative overflow-hidden group`}>
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform text-brand-600 pointer-events-none">
                       <Zap size={140} strokeWidth={1} />
                    </div>

                    {isAcceptedByOther && (
                      <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center p-4">
                        <div className="bg-gray-900 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl text-center transform -rotate-3 border-[6px] border-gray-800 flex flex-col items-center gap-2">
                          <Ban size={24} className="text-red-500" strokeWidth={3} />
                          <span className="tracking-[0.2em] mb-1">UNAVAILABLE</span>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Claimed by partner: {isAcceptedByOther}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col lg:flex-row justify-between gap-10 lg:items-center relative z-10">
                      <div className="flex items-center sm:items-start gap-6 md:gap-10 flex-1">
                        <div className="w-20 h-20 md:w-28 md:h-28 rounded-[2rem] flex flex-col items-center justify-center border-4 transition-all group-hover:bg-brand-600 group-hover:text-white bg-brand-50 border-white text-brand-600 shadow-xl group-hover:-translate-x-2">
                          <span className="text-[10px] md:text-sm font-black uppercase leading-none tracking-[0.2em] mb-1.5 md:mb-2 opacity-60">
                            {new Date(job.scheduledAt).toLocaleString('default', { month: 'short' })}
                          </span>
                          <span className="text-3xl md:text-5xl font-black leading-none tracking-tighter">
                            {new Date(job.scheduledAt).getDate()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-4">
                            <h3 className="text-xl md:text-3xl font-black text-gray-900 leading-tight">
                              {job.scrapTypes.join(', ')}
                            </h3>
                            <StatusBadge status={job.status} />
                          </div>
                          <div className="space-y-3">
                             <p className="text-sm md:text-lg text-gray-500 font-medium flex items-center gap-3">
                               <MapPin className="text-brand-500 flex-shrink-0 w-5 h-5" />
                               <span className="tracking-tight line-clamp-2">
                                 {job.status === 'Accepted' || job.status === 'Completed' 
                                   ? job.exactAddress 
                                   : job.generalArea + ' · Regional Mission'}
                               </span>
                             </p>
                             <div className="flex flex-wrap items-center gap-6">
                               <div className="flex items-center gap-2.5 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">
                                 <Clock size={16} className="text-brand-300" /> 
                                 {job.timeSlot ? getTimeSlotLabel(job.timeSlot) : new Date(job.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </div>
                               {job.status === 'Requested' && (
                                 <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">
                                    <Zap size={10} fill="currentColor" /> Flash Claim Pool
                                 </div>
                               )}
                             </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-4 lg:mt-0">
                         {job.status === 'Accepted' && (
                           <Button 
                             variant="ghost" 
                             className="flex-1 sm:flex-none py-6 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-sm border border-emerald-100 text-emerald-600 hover:bg-emerald-50 px-10 flex gap-3"
                             onClick={(e) => {
                               e.preventDefault();
                               const dest = job.location 
                                 ? `${job.location.lat},${job.location.lng}` 
                                 : encodeURIComponent(job.exactAddress || "");
                               window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                             }}
                           >
                             Navigate <Navigation size={18} />
                           </Button>
                         )}
                         
                         {job.status === 'Requested' ? (
                            <div className="flex gap-4 flex-1 sm:flex-none">
                               <Button 
                                 variant="primary" 
                                 onClick={() => handleDecision(job._id, 'accept')}
                                 disabled={processingId === job._id}
                                 className="py-6 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all bg-brand-600 hover:bg-brand-700 shadow-brand-500/20 px-12 flex-1 flex items-center justify-center gap-3 group/claim"
                               >
                                  {processingId === job._id ? 'Processing...' : (
                                    <>Claim Mission <Zap size={18} className="fill-current group-hover:scale-125 transition-transform" /> </>
                                  )}
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 onClick={() => handleDecision(job._id, 'deny')}
                                 disabled={processingId === job._id}
                                 className="py-6 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border border-gray-100 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-100 px-6"
                                 title="Pass this mission"
                               >
                                  <XSquare size={22} />
                               </Button>
                            </div>
                         ) : (
                           <div className="flex-1 lg:w-56">
                             <Link href={`/scrap-champ/orders/${job._id}`} className="block">
                               <Button 
                                  variant="ghost" 
                                  fullWidth
                                  className="py-6 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all border border-gray-100 hover:bg-brand-50 hover:text-brand-600 bg-white flex gap-3 items-center justify-center"
                               >
                                  Mission Files <ArrowRight size={18} />
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
