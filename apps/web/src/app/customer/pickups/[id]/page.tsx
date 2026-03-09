'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { StatusBadge, Loader, Button } from '../../../components/common';
import { useToast } from '../../../components/common/Toast';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { API_URL } from '../../../config/env';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Calendar, 
  User, 
  Phone, 
  Scale, 
  ImageIcon, 
  ShieldCheck, 
  Star,
  Zap,
  HelpCircle
} from 'lucide-react';

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
  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center bg-gray-50">
      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-gray-200 mb-6 shadow-sm border border-gray-100">
        <HelpCircle size={40} />
      </div>
      <p className="text-gray-400 font-bold mb-8">Order not found.</p>
      <Link href="/customer/pickups">
        <Button variant="ghost" className="rounded-xl px-8">Back to My Pickups</Button>
      </Link>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-4xl mx-auto">
          
          <div className="w-full flex justify-between items-center mb-10">
            <Link href="/customer/pickups" className="px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100 text-sm font-black text-gray-400 hover:text-brand-600 flex items-center gap-2 transition-all">
              <ArrowLeft size={18} />
              My Pickups
            </Link>
            <StatusBadge status={order.status} />
          </div>

          <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-xl border border-gray-100 w-full animate-fade-in relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5 text-brand-600 pointer-events-none">
                <Zap size={140} />
             </div>

             <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 relative z-10">
                
                {/* Image Section */}
                <div className="w-full lg:flex-1">
                   <div className="aspect-square sm:aspect-[4/3] bg-gray-50 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-[6px] border-white shadow-2xl relative group">
                      {order.photoUrl ? (
                         <img src={order.photoUrl} alt="Scrap" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-200 bg-gray-50">
                             <ImageIcon size={64} strokeWidth={1} />
                         </div>
                      )}
                      <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-white font-black text-[10px] uppercase tracking-widest shadow-sm">
                        Verification Image
                      </div>
                   </div>
                </div>

                {/* Details Section */}
                <div className="flex-1 flex flex-col justify-center">
                   <div className="mb-8">
                     <p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-3">Recycling Session</p>
                     <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">
                       {order.scrapTypes.join(', ')}
                     </h1>
                   </div>

                   <div className="flex items-center gap-3 mb-10">
                     <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 border border-brand-100 shadow-inner">
                        <Scale size={20} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Estimated Weight</p>
                        <p className="font-black text-gray-900 text-lg">
                           {order.estimatedWeight?.total ? `${order.estimatedWeight.total} kg` : 'Not specified'}
                        </p>
                     </div>
                   </div>

                   <div className="space-y-8">
                      <div className="flex items-start gap-4">
                         <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-brand-600 flex-shrink-0 border border-white shadow-sm">
                            <MapPin size={22} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Pickup Location</p>
                            <p className="font-bold text-gray-800 leading-relaxed text-sm">{order.exactAddress}</p>
                         </div>
                      </div>

                      <div className="flex items-start gap-4">
                         <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-brand-600 flex-shrink-0 border border-white shadow-sm">
                            <Clock size={22} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Scheduled Window</p>
                            <p className="font-bold text-gray-800 leading-tight">
                               {new Date(order.scheduledAt).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
                            </p>
                         </div>
                      </div>

                      <div className="flex items-start gap-4">
                         <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-brand-600 flex-shrink-0 border border-white shadow-sm">
                            <Calendar size={22} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Requested Date</p>
                            <p className="font-bold text-gray-800 leading-tight">
                               {new Date(order.createdAt).toLocaleString([], { dateStyle: 'long' })}
                            </p>
                         </div>
                      </div>
                   </div>

                   {order.champDetails && (
                     <div className="mt-12 pt-10 border-t border-gray-100 animate-slide-up">
                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] mb-5">Allocated Scrap Champion</p>
                        <div className="flex items-center justify-between bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-brand-500/5 group/champ hover:border-brand-100 transition-all">
                           <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 shadow-inner border border-brand-100 group-hover/champ:scale-105 transition-transform">
                                 <User size={28} />
                              </div>
                              <div>
                                 <p className="font-black text-gray-900 text-lg leading-none mb-1.5">{order.champDetails.name}</p>
                                 <div className="flex items-center gap-1.5">
                                    <ShieldCheck size={14} className="text-emerald-500" />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verified Partner</p>
                                 </div>
                              </div>
                           </div>
                           <a href={`tel:${order.champDetails.mobileNumber}`} className="w-12 h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30 hover:bg-brand-700 hover:rotate-12 transition-all">
                              <Phone size={22} />
                           </a>
                        </div>
                     </div>
                   )}

                   {order.status === 'Requested' && !order.champDetails && (
                     <div className="mt-12 p-6 bg-brand-50/50 rounded-3xl border border-dashed border-brand-200 text-center flex flex-col items-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
                        <p className="text-xs text-brand-700 font-black uppercase tracking-widest">Broadcasting for Partner...</p>
                     </div>
                   )}

                   {order.status === 'Completed' && !order.hasFeedback && (
                     <div className="mt-12 group">
                        <Link href={`/customer/feedback/${order._id}`}>
                           <Button variant="success" fullWidth size="lg" className="rounded-2xl py-6 shadow-xl shadow-emerald-500/20 text-lg flex gap-3">
                              Rate & Review Experience <Star size={20} fill="currentColor" />
                           </Button>
                        </Link>
                     </div>
                   )}

                   {order.hasFeedback && (
                     <div className="mt-12 p-8 bg-emerald-50/50 rounded-[2.5rem] border border-emerald-100 flex flex-col items-center gap-4 text-center group">
                        <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform">
                           <Star size={28} fill="currentColor" />
                        </div>
                        <p className="font-black text-emerald-700 uppercase tracking-widest text-xs">Feedback Submitted Successfully</p>
                     </div>
                   )}
                </div>
             </div>
          </div>

          <div className="mt-12 text-center text-gray-400 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
             Need Assistance? <span className="text-brand-500 hover:text-brand-700 cursor-pointer transition-colors border-b-2 border-brand-100 pb-0.5">Contact Support</span>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
