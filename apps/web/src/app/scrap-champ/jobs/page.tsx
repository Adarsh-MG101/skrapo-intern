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
  const [activeTab, setActiveTab] = useState<'my' | 'available'>('my');
  const [jobs, setJobs] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [acceptedByOthers, setAcceptedByOthers] = useState<Record<string, string>>({});

  const fetchJobs = async (tab: 'my' | 'available') => {
    setLoading(true);
    try {
      const endpoint = tab === 'my' ? '/orders/scrap-champ/my-jobs' : '/orders/scrap-champ/available-jobs';
      const res = await apiFetch(endpoint);
      const data = await res.json();
      if (res.ok) {
        setJobs(data);
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
        if (decision === 'accept') {
          setActiveTab('my'); // Navigate to active mission list
        } else {
          fetchJobs(activeTab);
        }
      } else {
        showToast(data.error || 'Decision failed', 'error');
        fetchJobs(activeTab); // Refresh in case another champion claimed it
      }
    } catch (err) {
      showToast('Network error', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    const checkInitialTab = async () => {
      try {
        const res = await apiFetch('/orders/scrap-champ/stats');
        if (res.ok) {
          const stats = await res.json();
          // If no assigned jobs but there are available ones, switch to available tab
          if (stats.myJobs === 0 && stats.availableJobs > 0) {
            setActiveTab('available');
          }
        }
      } catch (err) {
        console.error('Initial tab check failed:', err);
      }
    };
    checkInitialTab();
  }, [apiFetch]);

  useEffect(() => {
    fetchJobs(activeTab);
  }, [apiFetch, activeTab]);

  useEffect(() => {
    if (!socket) return;

    const handleRefresh = () => {
      console.log('🔄 [Jobs Board] Refreshing via socket');
      fetchJobs(activeTab);
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
  }, [socket, activeTab, user]);

  return (
    <ProtectedRoute allowedRoles={['scrapChamp']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">
                {activeTab === 'my' ? 'My Mission' : 'Local Opportunities'}
              </h1>
              <p className="text-gray-500 font-medium">
                {activeTab === 'my' 
                  ? 'Your confirmed pickups for today.' 
                  : 'Pickup requests in your area. Quickest response wins!'}
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="bg-white p-1.5 rounded-[1.5rem] border border-gray-100 shadow-sm flex items-center gap-1 w-full md:w-auto">
              <button 
                onClick={() => setActiveTab('my')}
                className={`flex-1 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'my' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
              >
                📅 Assigned
              </button>
              <button 
                onClick={() => setActiveTab('available')}
                className={`flex-1 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'available' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
              >
                🌐 Available
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState 
              title={activeTab === 'my' ? 'No Assignments' : 'No Local Requests'} 
              description={activeTab === 'my' 
                ? "You don't have any confirmed jobs right now. Check the 'Available' tab for pool requests!" 
                : "Awaiting new pickup requests in your pincode. We'll notify you via SMS when one drops."}
              icon={activeTab === 'my' ? '🛌' : '🔍'}
            />
          ) : (
            <div className="grid gap-6">
              {jobs.map((job) => {
                const isAcceptedByOther = acceptedByOthers[job._id];
                return (
                <div key={job._id} className={`bg-white rounded-[2.5rem] p-8 shadow-sm border ${isAcceptedByOther ? 'border-gray-200 opacity-60 pointer-events-none' : 'border-gray-100 hover:shadow-xl'} transition-all animate-fade-in relative overflow-hidden group`}>
                  
                  {isAcceptedByOther && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
                      <div className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black shadow-2xl text-center transform -rotate-3 border-4 border-gray-800">
                        🚫 CLAIMED
                        <p className="text-[10px] font-bold text-brand-300 mt-1 tracking-widest uppercase">Accepted by {isAcceptedByOther}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row justify-between gap-8 lg:items-center">
                    <div className="flex items-start gap-6 flex-1">
                      <div className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center border-2 transition-transform group-hover:scale-105 ${activeTab === 'my' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                        <span className="text-[10px] font-black uppercase leading-none tracking-widest mb-1">
                          {new Date(job.scheduledAt).toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="text-3xl font-black leading-none">
                          {new Date(job.scheduledAt).getDate()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-xl font-black text-gray-900 group-hover:text-brand-600 transition-colors">
                            {job.scrapTypes.join(', ')}
                          </h3>
                          <StatusBadge status={job.status} />
                        </div>
                        <p className="text-base text-gray-500 font-medium flex items-center gap-2 mb-4">
                          <span className="text-gray-300">📍</span>
                          {job.status === 'Accepted' || job.status === 'Completed' 
                            ? job.exactAddress 
                            : job.generalArea + ' (Regional Request)'}
                        </p>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="px-4 py-1.5 bg-gray-50 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="text-lg leading-none mt-[-2px]">⏰</span> 
                            {job.timeSlot ? getTimeSlotLabel(job.timeSlot) : new Date(job.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 lg:mt-0">
                       {job.status === 'Accepted' && (
                         <Button 
                           variant="ghost" 
                           className="w-full sm:w-auto flex justify-center items-center gap-2 border-emerald-100 text-emerald-600 hover:bg-emerald-50 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-sm"
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
                         <div className="flex gap-2 w-full sm:w-auto">
                            <Button 
                              variant="primary" 
                              onClick={() => handleDecision(job._id, 'accept')}
                              disabled={processingId === job._id}
                              className="px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 flex-1 sm:flex-none"
                            >
                               {processingId === job._id ? '...' : '⚡ Accept'}
                            </Button>
                            <Button 
                              variant="ghost" 
                              onClick={() => handleDecision(job._id, 'deny')}
                              disabled={processingId === job._id}
                              className="px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border border-gray-100 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-100 flex-1 sm:flex-none"
                            >
                               {processingId === job._id ? '...' : 'Pass'}
                            </Button>
                         </div>
                       ) : (
                         <Link href={`/scrap-champ/orders/${job._id}`} className="w-full sm:w-auto">
                           <Button 
                              variant="ghost" 
                              fullWidth
                              size="lg"
                              className="px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all border border-gray-100 hover:bg-brand-50 hover:text-brand-600 bg-white"
                           >
                              View Mission
                           </Button>
                         </Link>
                       )}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
