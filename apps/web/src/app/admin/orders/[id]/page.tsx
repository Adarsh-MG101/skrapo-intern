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
              className="text-sm font-bold text-gray-400 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Go Back
            </button>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white/50 px-2 py-1 rounded-md">ID: {order._id.slice(-6).toUpperCase()}</span>
               <StatusBadge status={order.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             
             {/* Left Column: Scrap Details & Photo */}
             <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-gray-100 overflow-hidden relative">
                   <div className="flex flex-col md:flex-row gap-8 md:gap-10">
                      <div className="flex-1">
                         <h2 className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Scrap Description</h2>
                         <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-6">
                            {order.scrapTypes.join(', ')}
                         </h1>
                         
                         <div className="aspect-[4/3] bg-gray-50 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-4 border-white shadow-lg relative group">
                            {order.status === 'Cancelled' ? (
                               <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 p-8 text-center">
                                   <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                   </svg>
                                   <p className="text-sm font-black uppercase tracking-widest">Image Hidden</p>
                                   <p className="text-[10px] font-bold mt-1 max-w-[140px]">Customer cancelled this pickup request</p>
                               </div>
                            ) : order.photoUrl ? (
                               <img src={order.photoUrl} alt="Scrap" className="w-full h-full object-cover" />
                            ) : (
                               <div className="w-full h-full flex items-center justify-center text-gray-200">
                                   <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                                     <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c0 1.1.9 2 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                                   </svg>
                               </div>
                            )}
                         </div>
                      </div>

                      <div className="md:w-64 space-y-6 md:y-8">
                         <div className="bg-brand-50/30 p-4 rounded-2xl border border-brand-100/50">
                            <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1">Estimated Weight</p>
                            <p className="text-xl md:text-2xl font-black text-gray-900">
                               {order.estimatedWeight?.total ? `${order.estimatedWeight.total}kg` : 'N/A'}
                            </p>
                         </div>
                         
                         <div className="space-y-4 px-1">
                            <div className="flex gap-3">
                               <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-lg flex-shrink-0">📍</div>
                               <div>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Address</p>
                                  <p className="text-xs font-bold text-gray-800 leading-tight">{order.exactAddress}</p>
                               </div>
                            </div>
                            <div className="flex gap-3">
                               <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-lg flex-shrink-0">⏰</div>
                               <div>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scheduled</p>
                                  <p className="text-xs font-bold text-gray-800 leading-tight">
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
                  <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-2 h-full bg-amber-400" />
                     <h2 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-6">Customer Feedback</h2>
                     
                     <div className="flex flex-col md:flex-row gap-8 md:gap-10">
                        <div className="flex-1">
                           <div className="flex text-amber-400 text-2xl md:text-3xl mb-4 drop-shadow-sm font-black">
                              {'★'.repeat(order.feedback.rating)}{'☆'.repeat(5 - order.feedback.rating)}
                           </div>
                           <p className="text-base md:text-lg font-medium text-gray-600 italic">
                              "{order.feedback.comments || 'No comments provided.'}"
                           </p>
                        </div>
                        
                        <div className="md:w-64 grid grid-cols-2 gap-3 md:gap-4">
                           <div className="p-3 md:p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Weight</p>
                              <p className="text-sm md:text-base font-bold text-gray-900">{order.feedback.weight}kg</p>
                           </div>
                           <div className="p-3 md:p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Price</p>
                              <p className="text-sm md:text-base font-bold text-gray-900">₹{order.feedback.price}</p>
                           </div>
                           <div className="col-span-2 p-3 md:p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Behavior</p>
                              <p className="text-sm md:text-base font-bold text-gray-900">{order.feedback.behavior}</p>
                           </div>
                        </div>
                     </div>
                  </div>
                )}
             </div>

             {/* Right Column: Stakeholders */}
             <div className="space-y-6 md:space-y-8">
                {/* Customer Card */}
                <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-gray-100 shadow-sm">
                   <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Customer Details</h2>
                   <div className="flex items-center gap-4">
                      <div className="w-14 md:w-16 h-14 md:h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black text-brand-500">
                         {order.customerDetails?.name?.[0]?.toUpperCase() || 'D'}
                      </div>
                      <div>
                         <p className="font-black text-gray-900 text-base md:text-lg leading-tight">{order.customerDetails?.name || 'Deleted User'}</p>
                         <p className="text-xs md:text-sm font-bold text-brand-600 mt-0.5">{order.customerDetails?.mobileNumber || 'N/A'}</p>
                      </div>
                   </div>
                </div>

                {/* Champ Card */}
                <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-gray-100 shadow-sm relative overflow-hidden">
                   {order.status === 'Assigned' || order.status === 'Accepted' || order.status === 'Completed' ? (
                      <>
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Scrap Champion</h2>
                        <div className="flex items-center gap-4">
                           <div className="w-14 md:w-16 h-14 md:h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black text-amber-600 border border-amber-100">
                              {order.champDetails?.name?.[0]?.toUpperCase() || '?'}
                           </div>
                           <div>
                              <p className="font-black text-gray-900 text-base md:text-lg leading-tight">{order.champDetails?.name || 'Deleted Partner'}</p>
                              <p className="text-xs md:text-sm font-bold text-amber-600 mt-0.5">{order.champDetails?.mobileNumber || 'N/A'}</p>
                           </div>
                        </div>
                      </>
                    ) : (
                       <div className="text-center py-6 px-4">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 border-2 shadow-sm transition-all ${order.notifiedChampsCount ? 'bg-blue-50 border-blue-100 text-blue-500 animate-pulse' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                             {order.notifiedChampsCount ? '📡' : '⏳'}
                          </div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status: {order.notifiedChampsCount ? 'Broadcasting' : 'Unassigned'}</p>
                          <p className="text-sm font-black text-gray-900 leading-tight">
                             {order.notifiedChampsCount === 0
                               ? 'Manual Intervention Needed'
                               : `Broadcasting to ${order.notifiedChampsCount || 1} Partners`}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold mt-2 italic px-4">Pincode matched broadcast active</p>

                          {/* Engagement Stats */}
                          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-around gap-2 px-2">
                             <div className="text-center group">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 group-hover:scale-110 transition-transform">Notified</p>
                                <p className="text-xl font-black text-gray-900">{order.notifiedChampsCount || 0}</p>
                             </div>
                             <div className="w-[1px] h-8 bg-gray-100" />
                             <div className="text-center group">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 group-hover:scale-110 transition-transform">Views</p>
                                <p className="text-xl font-black text-gray-900">{order.viewCount || 0}</p>
                             </div>
                             <div className="w-[1px] h-8 bg-gray-100" />
                             <div className="text-center group">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 group-hover:scale-110 transition-transform">Declined</p>
                                <p className="text-xl font-black text-gray-900">{order.declinedChampIds?.length || 0}</p>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>

                 {/* Assigned View (added stats for assigned case) */}
                 {(order.status === 'Accepted' || order.status === 'Completed') && (
                    <div className="mt-4 bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm flex items-center justify-around text-center">
                       <div>
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Link Clicks</p>
                          <p className="text-lg font-black text-gray-900">{order.viewCount || 'N/A'}</p>
                       </div>
                       <div className="w-[1px] h-8 bg-gray-100" />
                       <div>
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Acceptances</p>
                          <p className="text-lg font-black text-gray-900">1</p>
                       </div>
                    </div>
                 )}
             </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
