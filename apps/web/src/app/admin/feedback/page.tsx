'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { Loader, EmptyState } from '../../components/common';
import Link from 'next/link';
import { Star, MessageSquare, User, ArrowRight } from 'lucide-react';

export default function AdminFeedbackPage() {
  const { apiFetch, isLoading, isAuthenticated } = useAuth();
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await apiFetch('/feedback/admin');
        if (res.ok) {
          const data = await res.json();
          setFeedback(data);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (!isLoading && isAuthenticated) {
      fetchFeedback();
    }
  }, [isLoading, isAuthenticated, apiFetch]);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                 Feedback Reports <Star className="text-amber-500 fill-amber-500" size={32} />
              </h1>
              <p className="text-gray-500 font-medium mt-1">Analyze service quality and customer sentiment across the platform.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : (
            <div className="grid gap-8">
              {feedback.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] py-20 border border-gray-100 shadow-sm">
                   <EmptyState 
                        title="No Feedback Yet" 
                        description="Feedback reports will appear here once customers complete their ratings." 
                        icon={MessageSquare}
                   />
                </div>
              ) : (
                feedback.map((f) => (
                  <div key={f._id} className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-sm animate-fade-in hover:shadow-xl hover:shadow-brand-500/5 transition-all group overflow-hidden relative">
                    {/* Performance Indicator Bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${f.rating >= 4 ? 'bg-emerald-500' : f.rating >= 2.5 ? 'bg-amber-500' : 'bg-red-500'}`} />
                    
                    <div className="flex flex-col md:flex-row gap-10">
                      {/* Left Side: Core Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-6">
                           <div className="flex flex-col text-left">
                              <h3 className="text-xl font-black text-gray-900 tracking-tight">{f.customer?.name}</h3>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{new Date(f.createdAt).toLocaleDateString()} @ {new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                           </div>
                           <div className="flex-1" />
                           <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                 <Star 
                                    key={i} 
                                    size={20} 
                                    className={`${i < f.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100'}`}
                                    strokeWidth={3}
                                 />
                              ))}
                           </div>
                        </div>

                        <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 mb-6 relative">
                           <MessageSquare className="absolute -top-3 -left-3 text-brand-100 fill-brand-50" size={40} />
                           <p className="relative z-10 italic text-gray-600 font-medium leading-relaxed">
                              "{f.comments || 'No specific comments provided.'}"
                           </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Behavior</p>
                              <p className={`text-sm font-black ${f.behavior === 'Professional' ? 'text-emerald-600' : 'text-amber-600'}`}>{f.behavior || 'N/A'}</p>
                           </div>
                           <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cleared</p>
                              <p className="text-sm font-black text-gray-900">{f.weight ? `${f.weight} kg` : '--'}</p>
                           </div>
                           <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Price Paid</p>
                              <p className="text-sm font-black text-emerald-700">{f.price ? `₹${f.price}` : '--'}</p>
                           </div>
                           <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Rating Score</p>
                              <p className="text-sm font-black text-gray-900">{f.rating}/5.0</p>
                           </div>
                        </div>
                      </div>

                      {/* Right Side: Execution Summary */}
                      <div className="md:w-72 bg-gray-50/30 rounded-[2.5rem] p-8 border border-gray-100 border-dashed flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-brand-600 mb-4 text-2xl font-black shadow-md border border-gray-100 ring-8 ring-gray-50/50 group-hover:scale-110 transition-transform duration-300">
                           {f.scrapChamp?.name?.[0].toUpperCase() || <User size={24} />}
                        </div>
                        <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1">Champion Assigned</p>
                        <h4 className="text-lg font-black text-gray-900 tracking-tight mb-6">{f.scrapChamp?.name || 'Unknown Partner'}</h4>
                        <Link href={`/admin/orders/${f.orderId}`} className="w-full">
                           <div className="py-3 bg-white rounded-2xl border border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-widest hover:text-brand-600 hover:border-brand-600 hover:shadow-lg hover:shadow-brand-500/5 transition-all text-center flex items-center justify-center gap-2">
                              View Execution <ArrowRight size={14} />
                           </div>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
