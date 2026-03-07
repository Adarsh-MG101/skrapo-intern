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
        showToast('Pickup Completed! Great job! ♻️', 'success');
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
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-xl text-center border-t-8 border-blue-500 animate-scale-in">
           <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl shadow-inner">
             🤝
           </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight leading-tight">Already Claimed!</h2>
          <p className="text-gray-500 mb-10 font-medium text-lg leading-relaxed px-2">
            This order has already been accepted by another champion. <b>We'll notify you as soon as the next one arrives!</b>
          </p>
          <div className="space-y-4">
            <Button fullWidth size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20" onClick={() => router.push('/scrap-champ/jobs')}>
              Back to Jobs Board
            </Button>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Pincode: Regional Pooled Request</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorStatus === 403) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center border-t-4 border-amber-500">
           <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">!</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Champ Account Required</h2>
          <p className="text-gray-500 mb-8 font-medium">
            You are currently logged in as <b>{user?.name}</b> (Customer). This link is for Scrap Champions only.
          </p>
          <div className="space-y-3">
            <Button fullWidth onClick={() => { logout(); router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); }}>
              Login as Scrap Champ
            </Button>
            <Button variant="outline" fullWidth onClick={() => router.push(user?.defaultRoute || '/')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return (
    <div className="p-10 text-center min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <p className="text-gray-400 font-bold mb-4">Order not found.</p>
      <Link href="/scrap-champ/jobs"><Button variant="ghost">Back to Jobs</Button></Link>
    </div>
  );

  return (
    <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        
        <div className="w-full flex justify-between items-center mb-10">
          <button onClick={() => router.back()} className="text-sm font-bold text-gray-400 hover:text-gray-900 flex items-center gap-1.5 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
          <StatusBadge status={order.status} />
        </div>

        <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-xl border border-gray-100 w-full animate-fade-in">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
              
              {/* Image Section */}
              <div className="w-full lg:flex-1">
                  <div className="aspect-[4/3] bg-gray-50 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border-4 border-white shadow-lg relative group">
                    {order.photoUrl ? (
                        <img src={order.photoUrl} alt="Scrap" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                            <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c0 1.1.9 2 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                            </svg>
                        </div>
                    )}
                    <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 text-white font-black text-[10px] uppercase tracking-widest">
                      Preview
                    </div>
                  </div>
              </div>

              {/* Details Section */}
              <div className="flex-1 flex flex-col justify-center">
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    {order.scrapTypes.join(', ')}
                  </h1>
                  <div className="flex items-center gap-2 mb-8">
                    <span className="text-xs font-black bg-brand-50 text-brand-600 px-3 py-1 rounded-full uppercase tracking-widest">Estimated Weight</span>
                    <span className="font-bold text-gray-900">
                      {order.estimatedWeight?.total ? `${order.estimatedWeight.total}kg` : 'Not specified'}
                    </span>
                  </div>

                  <div className="space-y-6 mb-10">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">📍</div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pickup Location</p>
                          <p className="font-bold text-gray-900 leading-tight">
                              {order.status === 'Accepted' || order.status === 'Completed' 
                                ? order.exactAddress 
                                : order.generalArea + ' (Restricted)'}
                          </p>
                          {order.status === 'Assigned' || order.status === 'Requested' ? (
                              <p className={`text-xs font-bold mt-1 ${order.status === 'Requested' ? 'text-blue-600' : 'text-brand-600'}`}>
                                {order.status === 'Requested' ? 'Claim mission to reveal exact address' : 'Accept job to reveal exact address'}
                              </p>
                          ) : null}
                        </div>
                    </div>

                    {(order.status === 'Accepted' || order.status === 'Completed') && order.location && (
                        <div className="-mt-2 mb-6 animate-fade-in">
                          <CustomerMap location={order.location} />
                        </div>
                    )}

                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">⏰</div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scheduled Time</p>
                          <p className="font-bold text-gray-900 leading-tight">
                              {new Date(order.scheduledAt).toLocaleDateString([], { dateStyle: 'long' })} at {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : new Date(order.scheduledAt).toLocaleTimeString([], { timeStyle: 'short' })}
                          </p>
                        </div>
                    </div>
                  </div>

                  {(order.status === 'Requested' || order.status === 'Assigned') && (
                    <div className="flex gap-4">
                      <Button 
                          variant="primary" 
                          className={order.status === 'Requested' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : ''}
                          fullWidth 
                          onClick={() => handleDecision('accept')}
                          disabled={processing}
                          size="lg"
                      >
                          {processing ? 'Processing...' : order.status === 'Requested' ? '⚡ Claim This Mission' : 'Accept Job'}
                      </Button>
                      <Button 
                          variant="ghost" 
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
                    <div className="space-y-4">
                      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] text-center">
                          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xl mx-auto mb-4 border-4 border-emerald-100 shadow-lg animate-bounce">✅</div>
                          <h3 className="font-black text-emerald-900 mb-1">Job Accepted!</h3>
                          <p className="text-sm text-emerald-700 font-medium mb-6">Reach the pickup location to finish this job.</p>
                          
                          <Button 
                            variant="ghost" 
                            fullWidth 
                            className="mb-4 bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-100 font-black shadow-sm"
                            onClick={() => {
                              const dest = order.location 
                                ? `${order.location.lat},${order.location.lng}` 
                                : encodeURIComponent(order.exactAddress || '');
                              window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                            }}
                            leftIcon={<span className="mr-1">📍</span>}
                          >
                            Navigate to Pickup
                          </Button>

                          <Button 
                            variant="primary" 
                            fullWidth 
                            size="lg"
                            onClick={() => setShowCompleteModal(true)}
                            disabled={processing}
                            className="bg-emerald-600 hover:bg-emerald-700 border-none shadow-lg shadow-emerald-500/20"
                          >
                            {processing ? 'Finishing...' : 'Mark as Completed! ♻️'}
                          </Button>
                      </div>
                    </div>
                  )}

                  {order.status === 'Completed' && (
                    <div className="bg-blue-50 border border-blue-100 p-8 rounded-[2rem] text-center">
                        <div className="text-4xl mb-4">📜</div>
                        <h3 className="text-xl font-black text-blue-900 mb-1 tracking-tight">Receipt Generated</h3>
                        <p className="text-sm text-blue-700 font-medium mb-6">Great mission! You can now see this in your job history.</p>
                        <Link href="/scrap-champ/history">
                          <Button variant="ghost" fullWidth className="border-blue-200 text-blue-600 hover:bg-blue-100">
                            View in History
                          </Button>
                        </Link>
                    </div>
                  )}
              </div>
            </div>
        </div>

        <div className="mt-12 text-center text-gray-400 text-sm font-medium">
            Need help? Contact <span className="text-brand-500 font-bold hover:underline cursor-pointer">Support</span>
        </div>
      </div>

      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Complete Pickup"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCompleteModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={confirmComplete} disabled={processing}>
              {processing ? 'Finishing...' : 'Yes, Complete Pickup'}
            </Button>
          </>
        }
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex flex-col items-center justify-center text-emerald-600 border border-emerald-100 mx-auto mb-4 text-2xl">
            ♻️
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">Are you sure?</h3>
          <p className="text-gray-500 font-medium">Please confirm that you have successfully collected the scrap and completed this pickup mission.</p>
        </div>
      </Modal>
    </div>
  );
}
