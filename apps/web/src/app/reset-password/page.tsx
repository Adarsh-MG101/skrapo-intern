'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Zap, Lock, ArrowLeft } from 'lucide-react';

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { resetPasswordWithToken } = useAuth();

  useEffect(() => {
    const queryToken = searchParams.get('token');
    if (queryToken) {
      setToken(queryToken);
    } else {
      setError('Invalid or missing reset token.');
    }
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing reset token. Please use the link sent to your email.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await resetPasswordWithToken(token, newPassword);
    
    if (result.success) {
      setSuccess('Password reset successful! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } else {
      setError(result.error || 'Failed to reset password');
    }
    setLoading(false);
  };

  if (!token && !error) {
    return <div className="text-center p-8">Loading verification link...</div>;
  }

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 p-8 md:p-10 border border-gray-100 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-50 rounded-full blur-3xl opacity-50" />
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-[1.5rem] text-red-600 text-sm font-bold flex flex-col gap-2 animate-shake relative z-10">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="shrink-0" />
            {error}
          </div>
          {!token && (
            <Link href="/forgot-password" className="text-brand-600 hover:text-brand-700 underline text-xs mt-2 text-center">
              Request a new link
            </Link>
          )}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-[1.5rem] text-emerald-600 text-sm font-bold flex items-center gap-3 animate-fade-in relative z-10">
          <Zap size={20} className="shrink-0 fill-current" />
          {success}
        </div>
      )}

      {!success && token && (
        <form onSubmit={handleResetPassword} className="space-y-5 relative z-10">
          <div>
            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2 px-1">
              New Password
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError('');
                }}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-[1.5rem] outline-none font-bold transition-all"
                placeholder="At least 6 characters"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2 px-1">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-[1.5rem] outline-none font-bold transition-all"
                placeholder="Repeat new password"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-1 mt-2">
            <input 
              type="checkbox" 
              id="showPass" 
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            <label htmlFor="showPass" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Show Password</label>
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full py-4 bg-brand-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-brand-600/25 hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'Updating Password...' : 'Reset Password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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
            Create New Password
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            Please enter your new secure password below.
          </p>
        </div>

        <Suspense fallback={<div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 p-8 h-64 flex items-center justify-center">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>

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
