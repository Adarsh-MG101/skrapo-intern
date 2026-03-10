'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { StatusBadge, Loader, Button } from '../../../components/common';
import { useToast } from '../../../components/common/Toast';
import { getTimeSlotLabel } from '../../../utils/dateTime';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_URL } from '../../../config/env';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Star, 
  User, 
  Radio, 
  CircleOff, 
  ImageOff, 
  Calendar,
  IndianRupee,
  Scale,
  Phone,
  Ban,
  Inbox
} from 'lucide-react';
import { Modal } from '../../../components/common/Modal';

interface Order {
  _id: string;
  scrapTypes: string[];
  estimatedWeight: any;
  scheduledAt: string;
  timeSlot?: string;
  status: string;
  exactAddress: string;
  photoUrl?: string;
  createdAt: string;
  customerDetails?: {
    name: string;
    mobileNumber: string;
  };
  champDetails?: {
    name: string;
    mobileNumber: string;
  };
  feedback?: {
    rating: number;
    comments: string;
    weight: number;
    price: number;
    behavior: string;
  };
  notifiedChampsCount?: number;
  viewCount?: number;
  declinedChampIds?: string[];
}

export default function AdminOrderDetailsPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [engagementModal, setEngagementModal] = useState<{ isOpen: boolean; orderId: string | null; data: any }>({
    isOpen: false,
    orderId: null,
    data: null
  });
  const [loadingEngagement, setLoadingEngagement] = useState(false);

  const { apiFetch } = useAuth();

  const fetchEngagement = async (orderId: string) => {
    setLoadingEngagement(true);
    setEngagementModal(prev => ({ ...prev, isOpen: true, orderId, data: null }));
    try {
      const res = await apiFetch(`/orders/admin/${orderId}/engagement`);
      if (res.ok) {
        const data = await res.json();
        setEngagementModal(prev => ({ ...prev, data }));
      }
    } catch (err) {
      console.error('Engagement fetch error:', err);
    } finally {
      setLoadingEngagement(false);
    }
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/admin/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          setOrder(data);
        } else {
          showToast(data.error || 'Failed to fetch order', 'error');
        }
      } catch (err) {
        showToast('Connection failed', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (token && id) fetchOrder();
  }, [token, id]);

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader size="lg" /></div>;
  if (!order) return <div className="p-10 text-center"><p className="text-gray-400">Order not found.</p><Link href="/admin/orders"><Button variant="ghost">Back to Orders</Button></Link></div>;

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-6xl mx-auto">
          
          <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-10">
            <button 
              onClick={() => router.back()} 
              className="text-sm font-black text-gray-400 hover:text-gray-900 flex items-center gap-2 transition-all group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              Go Back
            </button>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white/50 px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">ID: {order._id.slice(-6).toUpperCase()}</span>
               <StatusBadge status={order.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             
             {/* Left Column: Scrap Details & Photo */}
             <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-gray-100 overflow-hidden relative">
                   <div className="flex flex-col md:flex-row gap-8 md:gap-10">
                      <div className="flex-1">
                         <h2 className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2 px-1">Scrap Description</h2>
                         <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-6">
                            {order.scrapTypes.join(', ')}
                         </h1>
                         
                         <div className="aspect-[4/3] bg-gray-50 rounded-[2rem] overflow-hidden border-4 border-white shadow-lg relative group">
                            {order.status === 'Cancelled' ? (
                               <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 p-8 text-center">
                                   <CircleOff size={64} className="mb-4 opacity-20" />
                                   <p className="text-sm font-black uppercase tracking-widest">Image Hidden</p>
                                   <p className="text-[10px] font-bold mt-1 max-w-[140px]">Customer cancelled this pickup request</p>
                               </div>
                            ) : order.photoUrl ? (
                               <img src={order.photoUrl} alt="Scrap" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                               <div className="w-full h-full flex flex-col items-center justify-center text-gray-200 bg-gray-50">
                                   <ImageOff size={80} strokeWidth={1.5} />
                                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mt-4">No Visual Provided</p>
                               </div>
                            )}
                         </div>
                      </div>

                      <div className="md:w-64 space-y-6 md:space-y-8">
                         <div className="bg-brand-50/30 p-5 rounded-3xl border border-brand-100/50 shadow-sm shadow-brand-500/5">
                            <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1 shadow-sm">Estimated Weight</p>
                            <p className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-2">
                               <Scale size={24} className="text-brand-500" />
                               {order.estimatedWeight?.total ? `${order.estimatedWeight.total}kg` : 'N/A'}
                            </p>
                         </div>
                         
                         <div className="space-y-5 px-1 pt-2">
                            <div className="flex gap-4">
                               <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 flex-shrink-0 shadow-sm border border-white">
                                  <MapPin size={20} />
                               </div>
                               <div>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Pickup Address</p>
                                  <p className="text-[13px] font-bold text-gray-800 leading-snug">{order.exactAddress}</p>
                               </div>
                            </div>
                            <div className="flex gap-4">
                               <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 flex-shrink-0 shadow-sm border border-white">
                                  <Calendar size={20} />
                               </div>
                               <div>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Scheduled Slot</p>
                                  <p className="text-[13px] font-bold text-gray-800 leading-tight">
                                     {new Date(order.scheduledAt).toLocaleDateString()} @ {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : new Date(order.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Feedback Section (if exists) */}
                {order.feedback && (
                  <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-gray-100 shadow-xl relative overflow-hidden group">
                     {/* Dynamic indicator based on rating */}
                     <div className={`absolute top-0 left-0 w-2.5 h-full ${order.feedback.rating >= 4 ? 'bg-emerald-500' : order.feedback.rating >= 2.5 ? 'bg-amber-400' : 'bg-red-500'}`} />
                     
                     <div className="flex items-center justify-between mb-8">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Customer Verification & Feedback</h2>
                        <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                           <Star size={16} fill="currentColor" />
                        </div>
                     </div>
                     
                     <div className="flex flex-col md:flex-row gap-10">
                        <div className="flex-1 relative">
                           <div className="flex gap-1 mb-4 drop-shadow-sm">
                              {[...Array(5)].map((_, i) => (
                                 <Star 
                                    key={i} 
                                    size={24} 
                                    className={`${i < order.feedback!.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-100 fill-gray-50'}`} 
                                    strokeWidth={3}
                                 />
                              ))}
                           </div>
                           <div className="relative p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                              <Star className="absolute -top-3 -left-3 text-amber-100 opacity-50" size={32} />
                              <p className="text-base md:text-lg font-medium text-gray-600 italic relative z-10">
                                 "{order.feedback.comments || 'No comments provided.'}"
                              </p>
                           </div>
                        </div>
                        
                        <div className="md:w-64 grid grid-cols-2 gap-4">
                           <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Net Weight</p>
                              <p className="text-base font-black text-gray-900">{order.feedback.weight}kg</p>
                           </div>
                           <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cash Paid</p>
                              <p className="text-base font-black text-emerald-600 flex items-center">
                                 <IndianRupee size={14} strokeWidth={3} className="mr-0.5" />{order.feedback.price}
                              </p>
                           </div>
                           <div className="col-span-2 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Champ Behavior</p>
                              <p className="text-sm font-black text-gray-900">{order.feedback.behavior}</p>
                           </div>
                        </div>
                     </div>
                  </div>
                )}
             </div>

             {/* Right Column: Stakeholders */}
             <div className="space-y-8">
                {/* Customer Card */}
                <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                   <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-1">Customer Profile</h2>
                   <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-2xl font-black text-brand-600 border border-brand-100 shadow-inner">
                         {order.customerDetails?.name?.[0]?.toUpperCase() || <User size={28} />}
                      </div>
                      <div>
                         <p className="font-black text-gray-900 text-lg leading-tight">{order.customerDetails?.name || 'Deleted User'}</p>
                         <p className="text-sm font-bold text-brand-600 mt-1 flex items-center gap-1.5">
                            <Phone size={14} /> {order.customerDetails?.mobileNumber || 'N/A'}
                         </p>
                      </div>
                   </div>
                </div>

                {/* Champ Card */}
                <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
                   {order.status === 'Assigned' || order.status === 'Accepted' || order.status === 'Completed' ? (
                      <>
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-1">Allocated Partner</h2>
                        <div className="flex items-center gap-5">
                           <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl font-black text-amber-600 border border-amber-100 shadow-inner group-hover:scale-105 transition-transform">
                              {order.champDetails?.name?.[0]?.toUpperCase() || <User size={28} />}
                           </div>
                           <div>
                              <p className="font-black text-gray-900 text-lg leading-tight">{order.champDetails?.name || 'Deleted Partner'}</p>
                              <p className="text-sm font-bold text-amber-600 mt-1 flex items-center gap-1.5">
                                 <Phone size={14} /> {order.champDetails?.mobileNumber || 'N/A'}
                              </p>
                           </div>
                        </div>
                      </>
                    ) : (
                       <div className="text-center py-6 px-2">
                          <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 border-2 shadow-sm transition-all ${order.notifiedChampsCount ? 'bg-blue-50 border-blue-100 text-blue-500' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                             {order.notifiedChampsCount ? <Radio className="animate-pulse" size={32} /> : <Clock size={32} />}
                          </div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Network Status</p>
                          <p className="text-base font-black text-gray-900 leading-tight">
                             {order.notifiedChampsCount === 0
                               ? 'Manual Allocation Queue'
                               : `Live Broadcast (${order.notifiedChampsCount})`}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold mt-3 italic px-6 leading-relaxed">System is broadcasting to nearby partners</p>

                          {/* Engagement Stats */}
                          <div className="mt-8 pt-8 border-t border-gray-50 grid grid-cols-3 gap-1">
                             <div className="text-center">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-tighter mb-1">Notified</p>
                                <p className="text-xl font-black text-gray-900">{order.notifiedChampsCount || 0}</p>
                             </div>
                             <div className="text-center border-x border-gray-50">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-tighter mb-1">Views</p>
                                <p className="text-xl font-black text-gray-900">{order.viewCount || 0}</p>
                             </div>
                             <div className="text-center">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-tighter mb-1">Declines</p>
                                <p className="text-xl font-black text-gray-900">{order.declinedChampIds?.length || 0}</p>
                             </div>
                          </div>
                       </div>
                    )}
                </div>

                {/* Engagement Performance */}
                {(order.status === 'Accepted' || order.status === 'Completed') && (
                   <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm transition-all hover:border-blue-100">
                      <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-1">Engagement Performance</h2>
                      <div className="flex items-center justify-between mb-6">
                         <div className="flex gap-3">
                            <div className="text-center">
                               <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-100 mb-2">
                                  {order.notifiedChampsCount || 0}
                               </div>
                               <p className="text-[8px] font-black text-gray-400 uppercase tracking-tight">Notified</p>
                            </div>
                            <div className="text-center">
                               <div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-red-100 mb-2">
                                  {order.declinedChampIds?.length || 0}
                               </div>
                               <p className="text-[8px] font-black text-gray-400 uppercase tracking-tight">Declined</p>
                             </div>
                          </div>
                          <div className="flex-1 text-right">
                             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Conversion</p>
                             <p className="text-2xl font-black text-gray-900">
                                {Math.round((1 / (order.notifiedChampsCount || 1)) * 100)}%
                             </p>
                          </div>
                       </div>
                       <button 
                          onClick={() => fetchEngagement(order._id)}
                          className="w-full py-3 bg-gray-50 hover:bg-white rounded-2xl border border-gray-100 hover:border-blue-200 text-[10px] font-black text-gray-500 hover:text-blue-600 uppercase tracking-[0.2em] transition-all shadow-sm flex items-center justify-center gap-2 group"
                       >
                          View Broadcast Log <ArrowLeft size={14} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                       </button>
                    </div>
                )}
             </div>

          </div>
        </div>
      </div>

      <Modal
        isOpen={engagementModal.isOpen}
        onClose={() => setEngagementModal(prev => ({ ...prev, isOpen: false }))}
        title="Champion Engagement Tracker"
        size="md"
      >
        {loadingEngagement ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader size="lg" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Retrieving regional response log...</p>
          </div>
        ) : engagementModal.data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100/50">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 px-1">Regional Reach</p>
                <p className="text-2xl font-black text-gray-900">{engagementModal.data.notified.length} Champions</p>
              </div>
              <div className="bg-red-50/50 p-4 rounded-3xl border border-red-100/50">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 px-1">Active Declines</p>
                <p className="text-2xl font-black text-gray-900">{engagementModal.data.declined.length}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Interaction Log</h3>
              <div className="bg-gray-50/50 rounded-[2rem] border border-gray-100 divide-y divide-gray-100 max-h-[400px] overflow-y-auto no-scrollbar">
                {engagementModal.data.notified.length === 0 ? (
                   <div className="p-10 text-center">
                      <Inbox className="mx-auto text-gray-200 mb-3" size={32} />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No regional matches</p>
                   </div>
                ) : engagementModal.data.notified.map((champ: any) => {
                  const isDeclined = champ.hasDeclined;
                  return (
                    <div key={champ.id} className="p-4 flex items-center justify-between group hover:bg-white transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border ${isDeclined ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-blue-600 border-gray-200'}`}>
                           {champ.name?.charAt(0) || <User size={16} />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 leading-none mb-1">{champ.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                             <Phone size={10} /> {champ.mobileNumber}
                          </p>
                        </div>
                      </div>
                      {isDeclined ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg text-[9px] font-black text-red-600 uppercase tracking-widest border border-red-100 shadow-sm">
                           <Ban size={12} /> Declined
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg text-[9px] font-black text-blue-600 uppercase tracking-widest border border-blue-100 shadow-sm">
                           <Radio size={12} className="animate-pulse" /> Notified
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </ProtectedRoute>
  );
}
