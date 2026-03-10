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
            <div className="grid gap-6">
              {jobs.map((job) => {
                const isAcceptedByOther = acceptedByOthers[job._id];
                const isRequested = job.status === 'Requested';
                
                return (
                  <div 
                    key={job._id} 
                    className={`bg-white rounded-[2rem] p-5 md:p-7 shadow-sm border transition-all duration-300 relative overflow-hidden group
                      ${isAcceptedByOther ? 'border-gray-100 opacity-40 pointer-events-none' : 
                        isRequested ? 'border-brand-100 bg-brand-50/10' : 'border-gray-50 hover:shadow-xl hover:-translate-y-1'}`}
                  >
                    {/* Background Decorative Icon */}
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform text-brand-600 pointer-events-none">
                       <Zap size={100} strokeWidth={1} />
                    </div>

                    {/* Unavailable Overlay */}
                    {isAcceptedByOther && (
                      <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] z-10 flex items-center justify-center p-4 text-center">
                        <div className="bg-gray-900 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-2xl border-4 border-gray-800 flex flex-col items-center gap-1">
                          <Ban size={20} className="text-red-500" strokeWidth={3} />
                          <span className="tracking-[0.15em] text-xs">UNAVAILABLE</span>
                          <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest text-center">Claimed by partner: {isAcceptedByOther}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-5 relative z-10">
                      {/* Top Row: Date, Status, Tag */}
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex flex-col items-center justify-center border-2 transition-all group-hover:bg-brand-600 group-hover:text-white bg-brand-50 border-white text-brand-600 shadow-md flex-shrink-0">
                          <span className="text-[8px] font-black uppercase leading-none tracking-widest mb-1 opacity-60">
                            {new Date(job.scheduledAt).toLocaleString('default', { month: 'short' })}
                          </span>
                          <span className="text-xl md:text-2xl font-black leading-none tracking-tighter">
                            {new Date(job.scheduledAt).getDate()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <StatusBadge status={job.status} />
                            {isRequested && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[8px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-1">
                                <Zap size={8} fill="currentColor" /> Pool Mission
                              </span>
                            )}
                          </div>
                          <h3 className="text-base md:text-xl font-black text-gray-900 leading-tight line-clamp-1">
                            {job.scrapTypes.join(', ')}
                          </h3>
                        </div>
                      </div>

                      {/* Content Section: Address and Time */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-600">
                         <div className="flex items-start gap-2.5">
                           <MapPin className="text-brand-500 mt-1 flex-shrink-0" size={16} />
                           <div className="min-w-0">
                             <p className="text-xs md:text-sm font-bold leading-tight">
                               {job.status === 'Accepted' || job.status === 'Completed' 
                                 ? job.exactAddress 
                                 : job.generalArea}
                             </p>
                             {isRequested ? (
                               <span className="text-[9px] text-brand-500 uppercase font-black tracking-widest mt-0.5 inline-block">Regional Mission Area</span>
                             ) : (
                               <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest mt-0.5 inline-block">Direct Assignment</span>
                             )}
                           </div>
                         </div>
                         
                         <div className="flex items-center gap-2.5">
                           <Clock className="text-brand-300 flex-shrink-0" size={16} />
                           <p className="text-xs md:text-sm font-bold">
                             {job.timeSlot ? getTimeSlotLabel(job.timeSlot) : new Date(job.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </p>
                         </div>
                      </div>
                      
                      {/* Action Row */}
                      <div className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-gray-100/50 mt-1">
                         {job.status === 'Accepted' && (
                           <Button 
                             variant="ghost" 
                             className="flex-1 py-3.5 sm:py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest border-2 border-emerald-100 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center gap-2 shadow-sm"
                             onClick={(e) => {
                               e.preventDefault();
                               const dest = job.location 
                                 ? `${job.location.lat},${job.location.lng}` 
                                 : encodeURIComponent(job.exactAddress || "");
                               window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                             }}
                           >
                              <Navigation size={16} /> GPS Navigate
                           </Button>
                         )}
                         
                         {isRequested ? (
                            <div className="flex gap-2.5 flex-1">
                               <Button 
                                 variant="primary" 
                                 onClick={() => handleDecision(job._id, 'accept')}
                                 disabled={processingId === job._id}
                                 className="flex-[3] py-3.5 sm:py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-brand-500/20 bg-brand-600 hover:bg-brand-700 px-6 flex items-center justify-center gap-2 group/claim"
                               >
                                  {processingId === job._id ? 'Processing...' : (
                                    <>Claim Mission <Zap size={14} className="fill-current group-hover:scale-110 transition-transform" /> </>
                                  )}
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 onClick={() => handleDecision(job._id, 'deny')}
                                 disabled={processingId === job._id}
                                 className="flex-1 py-3.5 sm:py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest border-2 border-gray-100 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-100 flex items-center justify-center"
                               >
                                  <XSquare size={18} />
                               </Button>
                            </div>
                         ) : (
                           <Link href={`/scrap-champ/orders/${job._id}`} className="flex-1 block">
                             <Button 
                                variant="ghost" 
                                fullWidth
                                className="py-3.5 sm:py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest border-2 border-gray-100 hover:bg-brand-50 hover:text-brand-600 bg-white flex items-center justify-center gap-2 shadow-sm"
                             >
                                View Order <ArrowRight size={16} />
                             </Button>
                           </Link>
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
