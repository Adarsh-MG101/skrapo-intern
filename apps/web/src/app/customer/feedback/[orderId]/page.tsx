'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import { Button, Input, Loader } from '../../../components/common';
import { useToast } from '../../../components/common/Toast';

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
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center border-t-4 border-red-500">
           <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">!</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Wrong Account</h2>
          <p className="text-gray-500 mb-8 font-medium">
            You are currently logged in as <b>{user?.name}</b>. This order was placed by a different customer.
          </p>
          <div className="space-y-3">
            <Button fullWidth onClick={() => { logout(); router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); }}>
              Login as different user
            </Button>
            <Button variant="outline" fullWidth onClick={() => router.push(user?.defaultRoute || '/')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return <div className="min-h-screen flex items-center justify-center text-gray-500 font-bold bg-gray-50">Order not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl shadow-brand-500/10 border border-gray-100 animate-fade-in text-center">
        <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-4xl shadow-sm border border-brand-100">
            ♻️
        </div>
        
        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">How was your pickup?</h1>
        <p className="text-gray-500 font-medium mb-10">Help us improve the Skrapo experience for everyone.</p>

        <form onSubmit={handleSubmit} className="space-y-8 text-left">
          {/* Star Rating */}
          <div className="flex flex-col items-center">
              <label className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Your Rating</label>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-4xl transition-all duration-300 transform hover:scale-125 ${rating >= star ? 'text-amber-400 drop-shadow-md' : 'text-gray-200 grayscale opacity-50'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-4">
              <Input 
                label="Weight Cleared (kg)" 
                placeholder="e.g. 12"
                value={formData.weight}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, weight: e.target.value})}
              />
              <Input 
                label="Price Received (₹)" 
                placeholder="e.g. 150"
                value={formData.price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, price: e.target.value})}
              />
          </div>

          <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 ml-1">Champ Behavior</label>
              <div className="grid grid-cols-2 gap-4">
                {['Professional', 'Friendly', 'Late', 'Unprofessional'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setFormData({...formData, behavior: b})}
                    className={`py-3 px-4 rounded-2xl border-2 font-bold transition-all text-sm
                      ${formData.behavior === b 
                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm' 
                        : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-brand-200'}
                    `}
                  >
                    {b}
                  </button>
                ))}
              </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 ml-1">Additional Comments</label>
            <textarea
              className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 outline-none transition-all duration-200 placeholder:text-gray-300 placeholder:font-medium hover:border-brand-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 min-h-[120px] text-gray-900"
              placeholder="Tell us more about your experience..."
              value={formData.comments}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, comments: e.target.value})}
          />
        </div>

        <Button 
          type="submit" 
          fullWidth 
          size="lg" 
          variant="primary" 
          disabled={submitting}
          isLoading={submitting}
        >
          Submit Feedback
        </Button>
        </form>
      </div>
    </div>
  );
}
