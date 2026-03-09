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
  Clock, 
  Recycle, 
  Truck, 
  CheckCircle2, 
  FileText, 
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
    <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
      <div className="max-w-4xl mx-auto">
        
        <div className="w-full flex justify-between items-center mb-10">
          <button onClick={() => router.back()} className="px-5 py-2.5 bg-white rounded-xl shadow-sm border border-gray-100 text-sm font-black text-gray-400 hover:text-brand-600 flex items-center gap-2 transition-all">
            <ArrowLeft size={18} />
            Go Back
          </button>
          <StatusBadge status={order.status} />
        </div>

        <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-xl border border-gray-100 w-full animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-brand-600 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                <Truck size={140} />
            </div>

            <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 relative z-10">
              
              {/* Image Section */}
              <div className="w-full lg:flex-1">
                  <div className="aspect-[4/3] bg-gray-50 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-[6px] border-white shadow-2xl relative group">
                    {order.photoUrl ? (
                        <img src={order.photoUrl} alt="Scrap" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Truck size={64} strokeWidth={1} />
                        </div>
                    )}
                    <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-white font-black text-[10px] uppercase tracking-widest shadow-sm">
                      Pickup Preview
                    </div>
                  </div>
              </div>

              {/* Details Section */}
              <div className="flex-1 flex flex-col justify-center">
                  <div className="mb-8">
                     <p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-2">Category Manifest</p>
                     <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
                        {order.scrapTypes.join(', ')}
                     </h1>
                  </div>

                  <div className="flex items-center gap-3 mb-10">
                    <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 border border-brand-100 shadow-inner">
                        <Scale size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Expected Payload</p>
                        <p className="font-black text-gray-900 text-xl tracking-tight">
                        {order.estimatedWeight?.total ? `${order.estimatedWeight.total} kg` : 'Weight Variable'}
                        </p>
                    </div>
                  </div>

                  <div className="space-y-8 mb-12">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-brand-600 flex-shrink-0 border border-white shadow-sm">
                            <MapPin size={24} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Collection Address</p>
                          <p className="font-black text-gray-800 leading-relaxed text-sm">
                              {order.status === 'Accepted' || order.status === 'Completed' 
                                ? order.exactAddress 
                                : order.generalArea + ' (Regional Pooled Request)'}
                          </p>
                          {order.status === 'Assigned' || order.status === 'Requested' ? (
                              <p className={`text-[10px] font-black mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${order.status === 'Requested' ? 'bg-blue-50 text-blue-600' : 'bg-brand-50 text-brand-600'} border border-current opacity-70`}>
                                <Zap size={10} fill="currentColor" /> {order.status === 'Requested' ? 'CLAIM TO REVEAL EXACT LOCATION' : 'ACCEPT TO REVEAL EXACT LOCATION'}
                              </p>
                          ) : null}
                        </div>
                    </div>

                    {(order.status === 'Accepted' || order.status === 'Completed') && order.location && (
                        <div className="-mt-2 mb-4 animate-fade-in">
                          <CustomerMap location={order.location} />
                        </div>
                    )}

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-brand-600 flex-shrink-0 border border-white shadow-sm">
                           <Clock size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Mission Window</p>
                          <p className="font-bold text-gray-900 leading-tight">
                              {new Date(order.scheduledAt).toLocaleDateString([], { dateStyle: 'long' })} · {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : new Date(order.scheduledAt).toLocaleTimeString([], { timeStyle: 'short' })}
                          </p>
                        </div>
                    </div>
                  </div>

                  {(order.status === 'Requested' || order.status === 'Assigned') && (
                    <div className="flex gap-4">
                      <Button 
                          variant="primary" 
                          className={`py-6 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl flex-1 flex items-center justify-center gap-3 ${order.status === 'Requested' ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20' : ''}`}
                          fullWidth 
                          onClick={() => handleDecision('accept')}
                          disabled={processing}
                          size="lg"
                      >
                          {processing ? 'Processing...' : (
                            <> {order.status === 'Requested' ? '⚡ Claim This Mission' : 'Accept Job'} <CheckCircle2 size={18} /> </>
                          )}
                      </Button>
                      <Button 
                          variant="ghost" 
                          className="py-6 rounded-2xl font-black text-[11px] uppercase tracking-widest flex-1 border border-gray-100 hover:bg-red-50 hover:text-red-600"
                          fullWidth 
                          onClick={() => handleDecision('deny')}
                          disabled={processing}
                          size="lg"
                      >
                          {order.status === 'Requested' ? 'Pass' : 'Decline'}
                      </Button>
                    </div>
                  )}

                  {order.status === 'Accepted' && (
                    <div className="space-y-4 animate-slide-up">
                      <div className="bg-white border-2 border-emerald-500/10 p-8 rounded-[2.5rem] text-center shadow-xl shadow-emerald-500/5 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-6 opacity-5 text-emerald-500 pointer-events-none">
                             <CheckCircle2 size={80} />
                          </div>

                          <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-emerald-500/30 animate-pulse relative z-10 border-4 border-white">
                             <Check size={32} strokeWidth={3} />
                          </div>
                          
                          <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Mission Engaged</h3>
                          <p className="text-sm text-gray-500 font-medium mb-8 max-w-[240px] mx-auto leading-relaxed">Exact coordinates have been revealed. Route to the customer to collect items.</p>
                          
                          <div className="flex flex-col gap-4">
                            <Button 
                              variant="ghost" 
                              fullWidth 
                              className="py-5 rounded-2xl bg-gray-50 border-gray-100 text-gray-900 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 font-black flex gap-3 text-xs uppercase tracking-[0.1em]"
                              onClick={() => {
                                const dest = order.location 
                                  ? `${order.location.lat},${order.location.lng}` 
                                  : encodeURIComponent(order.exactAddress || '');
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                              }}
                            >
                              Open Navigation <Navigation size={18} />
                            </Button>

                            <Button 
                              variant="primary" 
                              fullWidth 
                              size="lg"
                              onClick={() => setShowCompleteModal(true)}
                              disabled={processing}
                              className="bg-emerald-600 hover:bg-emerald-700 border-none shadow-xl shadow-emerald-500/30 py-6 rounded-2xl text-lg flex gap-3"
                            >
                              {processing ? 'Processing...' : 'Mark as Completed!'} <Recycle size={22} className="group-hover:rotate-180 transition-transform duration-700" />
                            </Button>
                          </div>
                      </div>
                    </div>
                  )}

                  {order.status === 'Completed' && (
                    <div className="bg-brand-50 border-2 border-brand-100 p-10 rounded-[2.5rem] text-center shadow-xl shadow-brand-500/5 relative overflow-hidden group">
                        <div className="absolute -left-4 -bottom-4 p-8 opacity-10 text-brand-600 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
                           <FileText size={100} />
                        </div>
                        
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-brand-600 mx-auto mb-6 shadow-sm border border-brand-100 relative z-10">
                           <FileText size={32} />
                        </div>
                        
                        <h3 className="text-2xl font-black text-brand-900 mb-2 tracking-tight">Session Finalized</h3>
                        <p className="text-sm text-brand-700 font-medium mb-10 max-w-[280px] mx-auto leading-relaxed">Mission completed successfully. Assessment and receipt have been archived.</p>
                        
                        <Link href="/scrap-champ/history">
                          <Button variant="ghost" fullWidth className="py-5 rounded-2xl bg-white border-brand-200 text-brand-600 hover:bg-brand-600 hover:text-white font-black text-xs uppercase tracking-widest shadow-sm">
                            View Earnings Log
                          </Button>
                        </Link>
                    </div>
                  )}
              </div>
            </div>
        </div>

        <div className="mt-12 text-center text-gray-400 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
            System Issue? <span className="text-brand-500 hover:text-brand-700 cursor-pointer transition-colors border-b-2 border-brand-100 pb-0.5">Contact Support</span>
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
