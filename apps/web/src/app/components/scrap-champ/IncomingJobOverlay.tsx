'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common';
import { MapPin, Clock, Zap, XSquare, Package, AlertCircle } from 'lucide-react';
import { useToast } from '../common/Toast';
import { getTimeSlotLabel } from '../../utils/dateTime';

interface OrderDetails {
  _id: string;
  scrapTypes: string[];
  estimatedWeight?: Record<string, number>;
  photoUrl?: string;
  photoUrls?: string[];
  scheduledAt: string;
  timeSlot?: string;
  generalArea: string;
  exactAddress?: string;
  status: string;
}

export default function IncomingJobOverlay() {
  const { socket } = useSocket();
  const { user, apiFetch } = useAuth();
  const { showToast } = useToast();
  
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [currentJob, setCurrentJob] = useState<OrderDetails | null>(null);
  const [fetching, setFetching] = useState(false);
  const [processingDecision, setProcessingDecision] = useState<'accept' | 'deny' | null>(null);

  const advanceQueue = useCallback(() => {
    setPendingIds(prev => prev.slice(1));
    setCurrentJob(null);
    setProcessingDecision(null);
  }, []);

  useEffect(() => {
    if (!socket || !user || user.role !== 'scrapChamp') return;

    console.log('[IncomingJobOverlay] Socket Active. Room Membership: PERSONAL, CHAMP_ROOM');

    const enqueue = (data: any, eventName: string) => {
      console.log(`[IncomingJobOverlay] Received signal: ${eventName}`, data);
      
      const id = data?.orderId;
      if (!id) return;

      if (data.targetPincode) {
        const champArea = user.serviceArea || '';
        if (!champArea.includes(data.targetPincode)) {
          console.log(`[IncomingJobOverlay] Job ${id} is for pincode ${data.targetPincode}. Skipping (Champ has ${champArea})`);
          return;
        }
        console.log(`[IncomingJobOverlay] Pincode match found: ${data.targetPincode}!`);
      }

      console.log('[IncomingJobOverlay] Enqueuing new job:', id);
      setPendingIds(prev => prev.includes(id) ? prev : [...prev, id]);
    };

    socket.on('new_available_job', (data) => enqueue(data, 'new_available_job'));
    socket.on('new_job_assigned', (data) => enqueue(data, 'new_job_assigned'));
    socket.on('new_job_assigned_manual', (data) => enqueue(data, 'new_job_assigned_manual'));
    socket.on('orderAssigned', (data) => enqueue(data, 'orderAssigned'));

    return () => {
      socket.off('new_available_job');
      socket.off('new_job_assigned');
      socket.off('new_job_assigned_manual');
      socket.off('orderAssigned');
    };
  }, [socket, user]);

  useEffect(() => {
    if (pendingIds.length === 0 || currentJob || fetching) return;

    const id = pendingIds[0];
    setFetching(true);

    apiFetch(`/orders/scrap-champ/${id}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'Requested' || data.status === 'Assigned') {
            setCurrentJob(data);
          } else {
            advanceQueue();
          }
        } else {
          console.error(`[IncomingJobOverlay] Fetch failed for order ${id}:`, res.status);
          advanceQueue();
        }
      })
      .catch((err) => {
        console.error(`[IncomingJobOverlay] Network error for order ${id}:`, err);
        advanceQueue();
      })
      .finally(() => setFetching(false));
  }, [pendingIds, currentJob, fetching, apiFetch, advanceQueue]);

  useEffect(() => {
    if (!socket || !currentJob) return;

    const handleGone = (data: any) => {
      if (data?.orderId === currentJob._id) {
        showToast('This job is no longer available', 'info');
        advanceQueue();
      }
    };

    socket.on('order_accepted_by_other', handleGone);
    socket.on('pickup_cancelled', handleGone);

    return () => {
      socket.off('order_accepted_by_other', handleGone);
      socket.off('pickup_cancelled', handleGone);
    };
  }, [socket, currentJob, advanceQueue, showToast]);

  const handleDecision = async (decision: 'accept' | 'deny') => {
    if (!currentJob || processingDecision) return;
    setProcessingDecision(decision);

    try {
      const res = await apiFetch(`/orders/scrap-champ/${currentJob._id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision })
      });
      const data = await res.json();

      if (res.ok) {
        showToast(decision === 'accept' ? 'Mission Accepted! 🎯' : 'Mission Declined.', 'success');
      } else {
        showToast(data.error || 'Action failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      advanceQueue();
      window.dispatchEvent(new CustomEvent('refresh_jobs'));
    }
  };

  if (!currentJob) return null;

  const totalWeight = Object.values(currentJob.estimatedWeight || {}).reduce((sum, w) => sum + (Number(w) || 0), 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border-2 border-brand-500/20 animate-zoom-in">
        
        <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto">
          {/* Header Area */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
                <AlertCircle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">New Pickup Mission</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Real-time Broadcast</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Order ID</span>
              <span className="text-xs font-black text-brand-600">#{currentJob._id.slice(-6).toUpperCase()}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scrap Details */}
            <div className="col-span-1 md:col-span-2 bg-brand-50/50 rounded-3xl p-5 border border-brand-100 flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-600 shadow-sm border border-brand-100 shrink-0">
                <Package size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1.5">Scrap Categories</p>
                <p className="text-lg font-black text-gray-900 leading-tight">
                  {currentJob.scrapTypes.join(', ')}
                </p>
              </div>
              {totalWeight > 0 && (
                <div className="text-right">
                  <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1.5">Est. Weight</p>
                  <p className="text-xl font-black text-gray-900">{totalWeight}kg</p>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="bg-emerald-50/50 rounded-3xl p-5 border border-emerald-100 flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 shrink-0">
                <Clock size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Time Window</p>
                <p className="font-bold text-gray-800 leading-snug text-sm">
                  {new Date(currentJob.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  <br />
                  <span className="text-gray-500 font-medium">Slot: {currentJob.timeSlot ? getTimeSlotLabel(currentJob.timeSlot) : 'Any Time'}</span>
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="bg-sky-50/50 rounded-3xl p-5 border border-sky-100 flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sky-600 shadow-sm border border-sky-100 shrink-0">
                <MapPin size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">Pickup Area</p>
                <p className="font-bold text-gray-800 leading-snug text-sm line-clamp-2">
                  {currentJob.generalArea || currentJob.exactAddress}
                </p>
              </div>
            </div>
          </div>

          {/* Photo Preview if available */}
          {(currentJob.photoUrl || (currentJob.photoUrls && currentJob.photoUrls.length > 0)) && (
            <div className="rounded-3xl border border-gray-100 overflow-hidden relative group">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
              <img 
                src={currentJob.photoUrl || currentJob.photoUrls?.[0]} 
                alt="Scrap Preview" 
                className="w-full h-32 object-cover"
              />
              <div className="absolute top-3 left-3 z-20 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[9px] font-black uppercase tracking-widest text-gray-700 shadow-sm">
                Material Preview
              </div>
            </div>
          )}
        </div>

        {/* Footer actions - Fixed height to avoid scroll */}
        <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100 shrink-0">
          <div className="flex gap-3">
            <Button 
              variant="primary" 
              onClick={() => handleDecision('accept')}
              disabled={processingDecision !== null}
              className="flex-1 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-500/25 bg-brand-600 hover:bg-brand-700 flex items-center justify-center gap-2 active:scale-95 touch-manipulation"
            >
              <Zap size={18} className="fill-current" />
              {processingDecision === 'accept' ? 'ACCEPTING...' : 'ACCEPT'}
            </Button>

            <Button 
              variant="ghost" 
              onClick={() => handleDecision('deny')}
              disabled={processingDecision !== null}
              className="flex-1 py-5 rounded-3xl font-black text-xs uppercase tracking-widest bg-red-50 text-red-600 border-2 border-red-100 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2"
            >
              <XSquare size={18} /> 
              {processingDecision === 'deny' ? 'DECLINING...' : 'DECLINE'}
            </Button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
