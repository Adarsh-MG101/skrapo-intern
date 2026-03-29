'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ForgotPasswordPage() {
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { forgotPassword } = useAuth();

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!contact) {
      setError('Email or mobile is required');
      return;
    }

    setLoading(true);
    const result = await forgotPassword(contact);
    if (result.success) {
      setSuccess('Reset link sent! Please check your email.');
    } else {
      setError(result.error || 'Failed to send reset link');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-900">
      <div className="max-w-md w-full animate-fade-in">
        {/* Header Branding */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
            <div className="w-12 h-12 bg-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-brand-500/10 group-hover:scale-110 transition-transform overflow-hidden border border-gray-100">
              <img src="/skrapo-logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-black tracking-tighter">Recyclemybin</span>
          </Link>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Forgot Password?
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            No worries, we'll send you reset instructions.
          </p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 p-8 md:p-10 border border-gray-100 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-50 rounded-full blur-3xl opacity-50" />
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-[1.5rem] text-red-600 text-sm font-bold flex items-center gap-3 animate-shake">
              <ShieldCheck size={20} className="shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-[1.5rem] text-emerald-600 text-sm font-bold flex items-center gap-3 animate-fade-in">
              <Zap size={20} className="shrink-0 fill-current" />
              {success}
            </div>
          )}

          <form onSubmit={handleRequestReset} className="space-y-6 relative z-10">
            <div>
              <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2 px-1">
                Email
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold"
                  placeholder="name@company.com"
                  disabled={loading || !!success}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !contact || !!success}
              className="w-full py-4 bg-brand-500 text-white font-black rounded-[1.5rem] shadow-xl shadow-brand-500/25 hover:bg-brand-600 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? 'Sending Link...' : 'Send Reset Link'}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-sm font-black text-gray-400 uppercase tracking-widest hover:text-brand-600 transition-all hover:gap-3"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
