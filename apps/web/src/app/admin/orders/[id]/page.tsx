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
  Phone
} from 'lucide-react';

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

                {/* Logistics Performance */}
                {(order.status === 'Accepted' || order.status === 'Completed') && (
                   <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm group">
                      <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-1">Logistics Insights</h2>
                      <div className="flex items-center justify-between text-center">
                         <div className="flex-1">
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 group-hover:scale-110 transition-transform">Link Clicks</p>
                            <p className="text-xl font-black text-gray-900">{order.viewCount || '0'}</p>
                         </div>
                         <div className="w-[1px] h-8 bg-gray-100" />
                         <div className="flex-1">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 group-hover:scale-110 transition-transform">Acceptance</p>
                            <p className="text-xl font-black text-gray-900">100%</p>
                         </div>
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
