'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { StatusBadge, Loader, Button } from '../../../components/common';
import { useToast } from '../../../components/common/Toast';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { API_URL } from '../../../config/env';

interface Order {
  _id: string;
  scrapTypes: string[];
  estimatedWeight: any;
  scheduledAt: string;
  status: string;
  exactAddress: string;
  photoUrl?: string;
  createdAt: string;
  hasFeedback?: boolean;
  champDetails?: {
    name: string;
    mobileNumber: string;
  };
}

export default function CustomerOrderDetailsPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/${id}`, {
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
  if (!order) return <div className="p-10 text-center"><p className="text-gray-400">Order not found.</p><Link href="/customer/pickups"><Button variant="ghost">Back to My Pickups</Button></Link></div>;

  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          
          <div className="w-full flex justify-between items-center mb-10">
            <Link href="/customer/pickups" className="text-sm font-bold text-gray-400 hover:text-gray-900 flex items-center gap-1.5 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              My Pickups
            </Link>
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
                        Captured Image
                      </div>
                   </div>
                </div>

                {/* Details Section */}
                <div className="flex-1 flex flex-col justify-center">
                   <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                     {order.scrapTypes.join(', ')}
                   </h1>
                   <div className="flex items-center gap-2 mb-8">
                     <span className="text-xs font-black bg-brand-50 text-brand-600 px-3 py-1 rounded-full uppercase tracking-widest">Est. Weight</span>
                     <span className="font-bold text-gray-900">
                        {order.estimatedWeight?.total ? `${order.estimatedWeight.total}kg` : 'Not specified'}
                     </span>
                   </div>

                   <div className="space-y-6">
                      <div className="flex gap-4">
                         <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">📍</div>
                         <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pickup Address</p>
                            <p className="font-bold text-gray-800 leading-tight">{order.exactAddress}</p>
                         </div>
                      </div>

                      <div className="flex gap-4">
                         <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">⏰</div>
                         <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scheduled For</p>
                            <p className="font-bold text-gray-800 leading-tight">
                               {new Date(order.scheduledAt).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
                            </p>
                         </div>
                      </div>

                      <div className="flex gap-4">
                         <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">📅</div>
                         <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Requested On</p>
                            <p className="font-bold text-gray-800 leading-tight">
                               {new Date(order.createdAt).toLocaleString([], { dateStyle: 'long' })}
                            </p>
                         </div>
                      </div>
                   </div>

                   {order.champDetails && (
                     <div className="mt-10 pt-8 border-t border-gray-100">
                        <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-4">Your Scrap Champion</p>
                        <div className="flex items-center justify-between bg-brand-50 rounded-2xl p-5 border border-brand-100 shadow-sm">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm border border-brand-100">
                                 🤵
                              </div>
                              <div>
                                 <p className="font-black text-gray-900 leading-none mb-1">{order.champDetails.name}</p>
                                 <p className="text-xs font-bold text-gray-500">Verified Professional</p>
                              </div>
                           </div>
                           <a href={`tel:${order.champDetails.mobileNumber}`} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-brand-600 shadow-md hover:scale-110 transition-transform border border-brand-100">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                           </a>
                        </div>
                     </div>
                   )}

                   {order.status === 'Requested' && !order.champDetails && (
                     <div className="mt-10 p-4 bg-brand-50/50 rounded-2xl border border-dashed border-brand-200">
                        <p className="text-xs text-brand-700 font-bold text-center">Finding a Scrap Champion for you...</p>
                     </div>
                   )}

                   {order.status === 'Completed' && !order.hasFeedback && (
                     <div className="mt-10">
                        <Link href={`/customer/feedback/${order._id}`}>
                           <Button variant="success" fullWidth size="lg">Rate & Review Your Experience</Button>
                        </Link>
                     </div>
                   )}

                   {order.hasFeedback && (
                     <div className="mt-10 p-6 bg-emerald-50 rounded-[2rem] border-2 border-emerald-100 flex items-center justify-center gap-3">
                        <span className="text-2xl">🌟</span>
                        <p className="font-black text-emerald-700 uppercase tracking-widest text-sm">Feedback Submitted! Thank you.</p>
                     </div>
                   )}
                </div>
             </div>
          </div>

          <div className="mt-12 text-center text-gray-400 text-sm font-medium">
             Need to change something? Contact <span className="text-brand-500 font-bold hover:underline cursor-pointer">Support</span>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
