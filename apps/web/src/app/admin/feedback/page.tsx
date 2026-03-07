'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { Loader, EmptyState } from '../../components/common';
import Link from 'next/link';
import { API_URL } from '../../config/env';

export default function AdminFeedbackPage() {
  const { token } = useAuth();
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await fetch(`${API_URL}/feedback/admin`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setFeedback(data);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchFeedback();
  }, [token]);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
               Feedback Reports <span className="text-amber-500">⭐️</span>
            </h1>
            <p className="text-gray-500 font-medium">Analyze service quality and customer sentiment across the platform.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : (
            <div className="grid gap-8">
              {feedback.length === 0 ? (
                <EmptyState 
                  title="No Feedback Yet" 
                  description="Feedback reports will appear here once customers complete their ratings." 
                />
              ) : (
                feedback.map((f) => (
                  <div key={f._id} className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-sm animate-fade-in hover:shadow-xl hover:shadow-brand-500/5 transition-all group overflow-hidden relative">
                    {/* Performance Indicator Bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${f.rating >= 4 ? 'bg-emerald-500' : f.rating >= 2.5 ? 'bg-amber-500' : 'bg-red-500'}`} />
                    
                    <div className="flex flex-col md:flex-row gap-10">
                      {/* Left Side: Core Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-6">
                           <div className="flex flex-col text-left">
                              <h3 className="text-xl font-black text-gray-900 tracking-tight">{f.customer?.name}</h3>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{new Date(f.createdAt).toLocaleDateString()} @ {new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                           </div>
                           <div className="flex-1" />
                           <div className="flex text-amber-400 text-2xl drop-shadow-sm font-black">
                              {'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}
                           </div>
                        </div>

                        <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 mb-6 italic text-gray-600 font-medium">
                           "{f.comments || 'No specific comments provided.'}"
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           <div className="p-4 bg-white rounded-2xl border border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Behavior</p>
                              <p className={`text-sm font-bold ${f.behavior === 'Professional' ? 'text-emerald-600' : 'text-amber-600'}`}>{f.behavior || 'N/A'}</p>
                           </div>
                           <div className="p-4 bg-white rounded-2xl border border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cleared</p>
                              <p className="text-sm font-bold text-gray-900">{f.weight ? `${f.weight} kg` : '--'}</p>
                           </div>
                           <div className="p-4 bg-white rounded-2xl border border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Price Paid</p>
                              <p className="text-sm font-bold text-gray-900">{f.price ? `₹${f.price}` : '--'}</p>
                           </div>
                           <div className="p-4 bg-white rounded-2xl border border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rating</p>
                              <p className="text-sm font-bold text-gray-900">{f.rating}/5.0</p>
                           </div>
                        </div>
                      </div>

                      {/* Right Side: Execution Summary */}
                      <div className="md:w-72 bg-gray-50/30 rounded-[2rem] p-8 border border-gray-100 border-dashed flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-brand-100 rounded-3xl flex items-center justify-center text-brand-600 mb-4 text-2xl font-black shadow-md ring-4 ring-white">
                           {f.scrapChamp?.name?.[0].toUpperCase() || 'C'}
                        </div>
                        <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1">Champion Assigned</p>
                        <h4 className="text-lg font-black text-gray-900 tracking-tight mb-4">{f.scrapChamp?.name || 'Unknown'}</h4>
                        <Link href={`/admin/orders/${f.orderId}`} className="w-full">
                           <div className="py-2.5 bg-white rounded-xl border border-gray-200 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-brand-600 hover:border-brand-600 transition-all text-center">
                              View Order
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
