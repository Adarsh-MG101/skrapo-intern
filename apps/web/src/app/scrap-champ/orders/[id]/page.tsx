'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { StatusBadge, Loader, Button } from '../../../components/common';
import { Modal } from '../../../components/common/Modal';
import { useToast } from '../../../components/common/Toast';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  ArrowLeft, 
  MapPin, 
  Recycle, 
  Truck, 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  HelpCircle,
  Scale,
  Navigation,
  Check
} from 'lucide-react';

const CustomerMap = dynamic(() => import('../../../components/customer/CustomerMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-48 bg-gray-50 animate-pulse rounded-2xl flex items-center justify-center text-gray-400 font-bold">Loading Map...</div>
});

import { getTimeSlotLabel } from '../../../utils/dateTime';

interface Order {
  _id: string;
  scrapTypes: string[];
  estimatedWeight: any;
  scheduledAt: string;
  timeSlot?: string;
  status: string;
  generalArea: string;
  exactAddress?: string;
  location?: { lat: number, lng: number };
  photoUrl?: string;
}

export default function OrderDecisionPage() {
  return (
    <ProtectedRoute allowedRoles={['scrapChamp']}>
      <OrderDetails />
    </ProtectedRoute>
  );
}

function OrderDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { apiFetch, user, logout } = useAuth();
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await apiFetch(`/orders/scrap-champ/${id}`);
        setErrorStatus(res.status);
        const data = await res.json();
        if (res.ok) {
          setOrder(data);
        } else if (res.status !== 401 && res.status !== 410 && res.status !== 403) {
          showToast(data.error || 'Failed to fetch order', 'error');
        }
      } catch (err) {
        showToast('Connection failed', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id, apiFetch]);

  const handleDecision = async (decision: 'accept' | 'deny') => {
    setProcessing(true);
    try {
      const res = await apiFetch(`/orders/scrap-champ/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(decision === 'accept' ? 'Assignment Accepted!' : 'Assignment Declined.', 'success');
        if (decision === 'accept') {
           const updated = await apiFetch(`/orders/scrap-champ/${id}`);
           setOrder(await updated.json());
        } else {
           router.push('/scrap-champ/jobs');
        }
      } else if (res.status !== 401) {
        showToast(data.error || 'Decision failed', 'error');
      }
    } catch (err) {
      showToast('Decision failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const confirmComplete = async () => {
    setProcessing(true);
    try {
      const res = await apiFetch(`/orders/scrap-champ/${id}/complete`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Pickup Completed! Great job!', 'success');
        setOrder(prev => prev ? { ...prev, status: 'Completed' } : null);
      } else if (res.status !== 401) {
        showToast(data.error || 'Failed to complete', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    } finally {
      setProcessing(false);
      setShowCompleteModal(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen bg-gray-50"><Loader size="lg" /></div>;

  if (errorStatus === 410) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-xl text-center border-t-8 border-brand-500 animate-scale-in">
           <div className="w-20 h-20 bg-brand-50 text-brand-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner border border-brand-100">
              <Zap size={40} className="fill-current" />
           </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight leading-tight">Already Claimed!</h2>
          <p className="text-gray-500 mb-10 font-medium text-lg leading-relaxed px-2">
            This mission has already been claimed by another Scrap Champ. <b>Watch for new alerts in your area!</b>
          </p>
          <div className="space-y-4">
            <Button fullWidth size="lg" className="bg-brand-600 hover:bg-brand-700 shadow-xl shadow-brand-500/20 py-6 rounded-2xl" onClick={() => router.push('/scrap-champ/jobs')}>
              Back to Missions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (errorStatus === 403) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-xl text-center border-t-8 border-amber-500">
           <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner border border-amber-100">
              <AlertTriangle size={40} />
           </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Access Restricted</h2>
          <p className="text-gray-500 mb-8 font-medium leading-relaxed">
            You are logged in as <b className="text-gray-900">{user?.name}</b> (Customer). This panel is reserved for verified Scrap Champions and requires specific partner credentials.
          </p>
          <div className="space-y-4">
            <Button fullWidth size="lg" className="rounded-2xl py-6" onClick={() => { logout(); router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); }}>
              Partner Login
            </Button>
            <Button variant="ghost" fullWidth onClick={() => router.push(user?.defaultRoute || '/')} className="rounded-2xl">
              Exit to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return (
    <div className="p-10 text-center min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-gray-200 mb-6 shadow-sm border border-gray-100">
        <HelpCircle size={40} />
      </div>
      <p className="text-gray-400 font-black mb-8">Mission file not found.</p>
      <Link href="/scrap-champ/jobs">
        <Button variant="ghost" className="rounded-xl px-8">Back to Missions</Button>
      </Link>
    </div>
  );

  return (
    <div className="bg-gray-50/30 min-h-screen pb-32 sm:pb-10">
      <div className="max-w-4xl mx-auto px-4 pt-6 sm:pt-10">
        
        <div className="w-full flex justify-between items-center mb-6">
          <button onClick={() => router.back()} className="px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100 text-xs font-black text-gray-400 hover:text-brand-600 flex items-center gap-2 transition-all">
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="scale-90 origin-right">
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 w-full animate-fade-in relative overflow-hidden">
            <div className="flex flex-col lg:flex-row relative z-10">
              
              {/* Left Column: Image & Basic Info */}
              <div className="w-full lg:w-[380px] p-5 sm:p-8 lg:border-r border-gray-50">
                  <div className="aspect-[4/3] bg-gray-50 rounded-[1.5rem] overflow-hidden border-4 border-white shadow-lg relative group mb-6">
                    {order.photoUrl ? (
                        <img src={order.photoUrl} alt="Scrap" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                            <Truck size={48} strokeWidth={1} />
                        </div>
                    )}
                    <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-white font-black text-[9px] uppercase tracking-widest">
                      Preview
                    </div>
                  </div>

                  <div className="mb-6">
                     <p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-1">Mission Manifest</p>
                     <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                        {order.scrapTypes.join(', ')}
                     </h1>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-2xl border border-white shadow-sm">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Payload</p>
                        <p className="font-black text-gray-900 text-lg tracking-tight flex items-center gap-1.5">
                          <Scale size={16} className="text-brand-500" />
                          {order.estimatedWeight?.total ? `${order.estimatedWeight.total} kg` : 'N/A'}
                        </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl border border-white shadow-sm">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Time Window</p>
                        <p className="font-bold text-gray-900 text-xs leading-tight">
                          {new Date(order.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                  </div>
              </div>

              {/* Right Column: Address, Map, and Quick Actions */}
              <div className="flex-1 p-5 sm:p-8 bg-gray-50/20">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-600 flex-shrink-0 border border-gray-100 shadow-sm">
                            <MapPin size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Target Address</p>
                          <p className="font-bold text-gray-800 leading-tight text-sm">
                              {order.status === 'Accepted' || order.status === 'Completed' 
                                ? order.exactAddress 
                                : order.generalArea + ' (Regional Pooled Request)'}
                          </p>
                          {(order.status === 'Assigned' || order.status === 'Requested') && (
                              <p className="text-[9px] font-black mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">
                                <Zap size={10} fill="currentColor" /> ACCEPT TO REVEAL LOCATION
                              </p>
                          )}
                        </div>
                    </div>

                    {(order.status === 'Accepted' || order.status === 'Completed') && order.location && (
                        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-inner h-[200px] sm:h-[250px]">
                          <CustomerMap location={order.location} />
                        </div>
                    )}

                    {/* Desktop-only secondary status card when Accepted */}
                    {order.status === 'Accepted' && (
                      <div className="hidden lg:block bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-md">
                            <Check size={18} strokeWidth={3} />
                          </div>
                          <h4 className="text-sm font-black text-emerald-900">Engagement Mode</h4>
                        </div>
                        <p className="text-[11px] text-emerald-700 font-medium mb-4 leading-relaxed">
                          Follow the map to the target coordinates and finalize the collection.
                        </p>
                        <div className="flex gap-3">
                          <Button 
                            variant="ghost" 
                            fullWidth 
                            className="bg-white text-emerald-700 border-emerald-100 font-black text-[10px] uppercase tracking-wider py-3"
                            onClick={() => {
                              const dest = order.location ? `${order.location.lat},${order.location.lng}` : encodeURIComponent(order.exactAddress || '');
                              window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                            }}
                          >
                            Nav <Navigation size={14} />
                          </Button>
                          <Button 
                            variant="primary" 
                            fullWidth 
                            className="bg-emerald-600 hover:bg-emerald-700 border-none font-black text-[10px] uppercase tracking-wider py-3"
                            onClick={() => setShowCompleteModal(true)}
                          >
                            Finish
                          </Button>
                        </div>
                      </div>
                    )}

                    {order.status === 'Completed' && (
                      <div className="bg-brand-50 border border-brand-100 p-5 rounded-2xl text-center">
                          <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1 text-center">Protocol Complete</p>
                          <h3 className="text-lg font-black text-gray-900 mb-4 tracking-tight">Mission Finalized</h3>
                          <Link href="/scrap-champ/history">
                            <Button variant="ghost" fullWidth className="py-3 bg-white border-brand-200 text-brand-600 font-black text-[10px] uppercase tracking-widest whitespace-nowrap">
                              Earning Logs
                            </Button>
                          </Link>
                      </div>
                    )}

                    {(order.status === 'Requested' || order.status === 'Assigned') && (
                      <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <Button 
                            variant="primary" 
                            className="py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex-1"
                            onClick={() => handleDecision('accept')}
                            disabled={processing}
                        >
                            {processing ? '...' : (order.status === 'Requested' ? '⚡ Claim' : 'Accept')}
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex-1 border border-gray-200"
                            onClick={() => handleDecision('deny')}
                            disabled={processing}
                        >
                            {order.status === 'Requested' ? 'Pass' : 'Decline'}
                        </Button>
                      </div>
                    )}
                  </div>
              </div>
            </div>
        </div>

        {/* Sticky Mobile Footer for Essential Actions */}
        {order.status === 'Accepted' && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-50 flex gap-3 animate-slide-up">
            <Button 
              variant="ghost" 
              className="bg-gray-100 text-gray-800 font-black text-[11px] uppercase tracking-[0.15em] flex-1 py-4 flex gap-2 rounded-xl"
              onClick={() => {
                const dest = order.location ? `${order.location.lat},${order.location.lng}` : encodeURIComponent(order.exactAddress || '');
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
              }}
            >
              Navigation <Navigation size={18} />
            </Button>
            <Button 
              variant="primary" 
              className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 text-white font-black text-[11px] uppercase tracking-[0.15em] flex-[1.5] py-4 flex gap-2 rounded-xl"
              onClick={() => setShowCompleteModal(true)}
            >
              Mark Completed <Check size={18} strokeWidth={3} />
            </Button>
          </div>
        )}

        <div className="mt-10 mb-6 text-center text-gray-300 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
            System Issue? <span className="text-gray-400 border-b border-gray-200 pb-0.5">Contact Support</span>
        </div>
      </div>

      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Finalize Pickup"
        footer={
          <div className="flex gap-4 w-full">
            <Button variant="ghost" fullWidth className="rounded-xl py-4" onClick={() => setShowCompleteModal(false)}>Cancel</Button>
            <Button variant="primary" fullWidth className="rounded-xl py-4 shadow-xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700" onClick={confirmComplete} disabled={processing}>
              {processing ? '...' : (
                <span className="flex items-center gap-2 justify-center">Confirm Complete <Check size={18} strokeWidth={3} /></span>
              )}
            </Button>
          </div>
        }
      >
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-600 border-4 border-white shadow-xl mx-auto mb-8 relative">
            <Recycle size={40} className="animate-spin-slow" />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white border-4 border-white shadow-md">
               <ShieldCheck size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tighter">Are you sure?</h3>
          <p className="text-gray-500 font-medium leading-relaxed max-w-[280px] mx-auto">Please confirm that you have successfully collected the scrap items and finalized the transaction at the doorstep.</p>
        </div>
      </Modal>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
