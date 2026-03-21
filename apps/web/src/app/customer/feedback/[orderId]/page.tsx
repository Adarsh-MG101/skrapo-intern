'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import { Button, Input, Loader } from '../../../components/common';
import { useToast } from '../../../components/common/Toast';
import { Star, Recycle, AlertCircle, MessageSquare, ArrowRight, ArrowLeft, UserCircle, Weight, Coins, ShieldCheck, Clock, UserMinus } from 'lucide-react';

export default function CustomerFeedbackPage() {
  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <FeedbackContent />
    </ProtectedRoute>
  );
}

function FeedbackContent() {
  const { orderId } = useParams();
  const router = useRouter();
  const { token, user, logout, apiFetch } = useAuth();
  const { showToast } = useToast();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [formData, setFormData] = useState({
    weight: '',
    price: '',
    behavior: 'Professional',
    comments: ''
  });

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await apiFetch(`/orders/${orderId}`);
        setErrorStatus(res.status);
        const data = await res.json();
        if (res.ok) {
          setOrder(data);
        } else {
          showToast(data.error || 'Order not found', 'error');
        }
      } catch (err) {
        showToast('Failed to load order details', 'error');
      } finally {
        setLoading(false);
      }
    };
    if (token && orderId) fetchOrder();
  }, [token, orderId, apiFetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      showToast('Please select a star rating', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/feedback', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          rating,
          ...formData
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Thank you for your feedback!', 'success');
        router.push('/customer/pickups');
      } else {
        showToast(data.error || 'Submission failed', 'error');
      }
    } catch (err) {
      showToast('Something went wrong', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader size="lg" /></div>;
  
  if (errorStatus === 403) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl text-center border-t-8 border-red-500 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-5">
              <UserMinus size={120} />
           </div>
           <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-inner">
              <AlertCircle size={40} />
           </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Access Denied</h2>
          <p className="text-gray-500 mb-10 font-medium leading-relaxed">
            You are logged in as <b className="text-gray-900">{user?.name}</b>. This session belongs to another user.
          </p>
          <div className="space-y-4">
            <Button fullWidth onClick={() => { logout(); router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); }} className="rounded-2xl py-6">
              Switch Account
            </Button>
            <Button variant="ghost" fullWidth onClick={() => router.push(user?.defaultRoute || '/')} className="rounded-2xl">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return <div className="min-h-screen flex items-center justify-center text-gray-500 font-bold bg-gray-50">Session not found</div>;

  return (
    <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-3 sm:p-6 lg:p-10">
      <div className="max-w-2xl w-full bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 shadow-2xl shadow-brand-500/10 border border-gray-100 animate-fade-in text-center relative overflow-hidden">
        {/* Back Button */}
        <button 
          onClick={() => router.back()}
          className="absolute top-6 left-6 p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-brand-600 transition-all z-20 flex items-center gap-2 text-xs font-black uppercase tracking-widest"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="absolute -left-10 -top-10 opacity-5">
           <Recycle size={200} />
        </div>
        
        <div className="w-24 h-24 bg-brand-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-brand-600 shadow-sm border border-brand-100 relative z-10">
            <Recycle size={48} strokeWidth={2.5} />
        </div>
        
        <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight mb-2 sm:mb-3">Rate Your Pickup</h1>
        <p className="text-sm sm:text-base text-gray-500 font-medium mb-8 sm:mb-12 max-w-sm mx-auto">Your feedback ensures our Scrap Champs maintain professional service and accuracy.</p>

        <form onSubmit={handleSubmit} className="space-y-12 text-left relative z-10">
          {/* Star Rating */}
          <div className="flex flex-col items-center bg-gray-50/50 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-gray-100 shadow-inner">
              <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 sm:mb-6">Service Quality</label>
              <div className="flex gap-2 sm:gap-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                    className="transition-all duration-300 transform hover:scale-125 active:scale-95 outline-none"
                  >
                    <Star 
                      className={`
                        w-8 h-8 sm:w-12 sm:h-12
                        ${(hoveredRating || rating) >= star 
                          ? 'fill-amber-400 text-amber-500 drop-shadow-lg' 
                          : 'text-gray-200 fill-transparent'}
                      `}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs font-black text-brand-600 uppercase tracking-widest h-4">
                 {(hoveredRating || rating) === 5 ? 'Exceptional' : (hoveredRating || rating) === 4 ? 'Very Good' : (hoveredRating || rating) === 3 ? 'Good' : (hoveredRating || rating) === 2 ? 'Fair' : (hoveredRating || rating) === 1 ? 'Poor' : ''}
              </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
                   <Weight size={14} className="text-brand-500" /> Exact Weight (kg)
                </label>
                <Input 
                  placeholder="e.g. 12.5"
                  value={formData.weight}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, weight: e.target.value})}
                  className="rounded-2xl border-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
                   <Coins size={14} className="text-brand-500" /> Amount Paid (₹)
                </label>
                <Input 
                  placeholder="e.g. 150"
                  value={formData.price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, price: e.target.value})}
                  className="rounded-2xl border-2"
                />
              </div>
          </div>

          <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
                 <UserCircle size={16} className="text-brand-500" /> Pickup Experience
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'Professional', Icon: ShieldCheck, color: 'text-blue-500' },
                  { id: 'Friendly', Icon: Star, color: 'text-amber-500' },
                  { id: 'On-Time', Icon: Clock, color: 'text-emerald-500' },
                  { id: 'Rude', Icon: UserMinus, color: 'text-red-500' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormData({...formData, behavior: item.id})}
                    className={`py-4 px-2 rounded-2xl border-2 font-black transition-all text-[10px] uppercase tracking-widest flex flex-col items-center gap-2
                      ${formData.behavior === item.id 
                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-md' 
                        : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-brand-100'}
                    `}
                  >
                    <item.Icon size={18} className={formData.behavior === item.id ? item.color : 'text-gray-300'} />
                    {item.id}
                  </button>
                ))}
              </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
               <MessageSquare size={16} className="text-brand-500" /> Observations / Compliments
            </label>
            <textarea
              className="w-full bg-white border-2 border-gray-100 rounded-[1.5rem] px-5 py-4 outline-none transition-all duration-200 placeholder:text-gray-300 placeholder:font-medium hover:border-brand-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 min-h-[120px] text-gray-900"
              placeholder="How was the weighing process? Any specific feedback for our Scrap Champ?"
              value={formData.comments}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, comments: e.target.value})}
          />
        </div>

        <Button 
          type="submit" fullWidth size="lg" variant="primary" disabled={submitting} isLoading={submitting}
          className="rounded-2xl py-4 sm:py-6 shadow-xl shadow-brand-500/20 text-base sm:text-lg flex items-center justify-center gap-3"
        >
          Submit Feedback <ArrowRight size={20} />
        </Button>
        </form>
      </div>
    </div>
  );
}
