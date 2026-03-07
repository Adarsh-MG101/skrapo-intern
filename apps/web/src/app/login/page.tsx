'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { validatePhone, validateEmail } from '../utils/validators';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState('');
  const [loginType, setLoginType] = useState<'email' | 'mobile'>('email');
  const [otpSent, setOtpSent] = useState(false);
  
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, requestOTP, verifyOTP, googleLogin, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(redirect || user.defaultRoute);
    }
  }, [isAuthenticated, user, router, redirect]);

  const handleRequestOTP = async () => {
    setFieldErrors({});
    let hasErrors = false;
    const newFieldErrors: Record<string, string> = {};

    if (!mobileNumber) {
      newFieldErrors.mobileNumber = 'This field is required!';
      hasErrors = true;
    } else if (!validatePhone(mobileNumber)) {
      newFieldErrors.mobileNumber = 'Please enter a valid phone number (min 10 digits)';
      hasErrors = true;
    }

    if (hasErrors) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setError('');
    setLoading(true);
    const result = await requestOTP(countryCode + mobileNumber.replace(/\D/g, ''));
    if (result.success) {
      setOtpSent(true);
    } else {
      setError(result.error || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleGoogleLoginSuccess = async (credential: string) => {
    setLoading(true);
    setError('');
    const result = await googleLogin(credential);
    
    if (result.success) {
      if (result.needsPhone && result.googleData) {
        // Redirect to register with google data
        const { googleId, email, name } = result.googleData;
        router.push(`/register?googleId=${googleId}&email=${email}&name=${name}`);
      } else if (result.defaultRoute) {
        router.push(redirect || result.defaultRoute);
      }
    } else {
      setError(result.error || 'Google login failed');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    let hasErrors = false;
    const newFieldErrors: Record<string, string> = {};

    let result;
    if (loginType === 'email') {
      if (!email) {
        newFieldErrors.email = 'This field is required!';
        hasErrors = true;
      } else if (!validateEmail(email)) {
        newFieldErrors.email = 'Please enter a valid email address';
        hasErrors = true;
      }

      if (!password) {
        newFieldErrors.password = 'This field is required!';
        hasErrors = true;
      }

      if (hasErrors) {
        setFieldErrors(newFieldErrors);
        return;
      }

      setLoading(true);
      result = await login(email, password);
    } else {
      if (!mobileNumber) {
        newFieldErrors.mobileNumber = 'This field is required!';
        hasErrors = true;
      } else if (!validatePhone(mobileNumber)) {
        newFieldErrors.mobileNumber = 'Please enter a valid phone number (min 10 digits)';
        hasErrors = true;
      }

      if (otpSent && !otp) {
        newFieldErrors.otp = 'This field is required!';
        hasErrors = true;
      }

      if (hasErrors) {
        setFieldErrors(newFieldErrors);
        return;
      }

      setLoading(true);
      const fullMobileNumber = countryCode + mobileNumber.replace(/\D/g, '');
      result = await verifyOTP(fullMobileNumber, otp);
      if (result.success && result.isNewUser) {
        // New user verified via OTP but needs to complete registration
        router.push(`/register?mobileNumber=${fullMobileNumber}`);
        return;
      }
    }

    if (result.success && result.defaultRoute) {
      router.push(redirect || result.defaultRoute);
    } else {
      setError(result.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex text-gray-900">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-brand-400/20 rounded-full blur-2xl"></div>
        </div>
        <div className="relative text-center animate-fade-in">
          <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 animate-float shadow-2xl overflow-hidden border-4 border-white/20">
            <img src="/skrapo-logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Skrapo</h1>
          <p className="text-brand-100 text-lg max-w-sm mx-auto leading-relaxed">
            Sign in to continue managing your scrap pickups and contribute to a greener planet.
          </p>
          <div className="mt-12 flex justify-center gap-8">
            {['📦', '🏆', '♻️'].map((emoji, i) => (
              <div
                key={i}
                className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm animate-fade-in"
                style={{ animationDelay: `${(i + 1) * 200}ms` }}
              >
                {emoji}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden border border-gray-100">
              <img src="/skrapo-logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-black text-gray-900 tracking-tighter">Skrapo</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-extrabold text-gray-900">Sign In</h2>
              <p className="text-gray-500 mt-2">Enter your credentials to continue</p>
            </div>

            <div className="mb-6 flex justify-center">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (credentialResponse.credential) {
                    handleGoogleLoginSuccess(credentialResponse.credential);
                  }
                }}
                onError={() => {
                  setError('Google Sign-In failed. Please try again.');
                }}
                useOneTap
                theme="outline"
                shape="rectangular"
                width="250"
                text="signin_with"
              />
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500 italic">or use</span>
              </div>
            </div>

            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
              <button
                onClick={() => setLoginType('email')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  loginType === 'email' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Email
              </button>
              <button
                onClick={() => setLoginType('mobile')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  loginType === 'mobile' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                OTP
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2 animate-fade-in">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {loginType === 'email' ? (
                <>
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </span>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                        }}
                        onBlur={() => {
                          if (!email) {
                            setFieldErrors(prev => ({ ...prev, email: 'This field is required!' }));
                          } else if (!validateEmail(email)) {
                            setFieldErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
                          }
                        }}
                        className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl outline-none transition-all placeholder-gray-400 ${
                          fieldErrors.email 
                            ? 'border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-100' 
                            : 'border-gray-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-gray-900'
                        }`}
                        placeholder="you@example.com"
                      />
                    </div>
                    {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </span>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                        }}
                        onBlur={() => {
                          if (!password && loginType === 'email') {
                            setFieldErrors(prev => ({ ...prev, password: 'This field is required!' }));
                          }
                        }}
                        className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl outline-none transition-all placeholder-gray-400 ${
                          fieldErrors.password 
                            ? 'border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-100' 
                            : 'border-gray-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-gray-900'
                        }`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="mobile" className="block text-sm font-semibold text-gray-700 mb-2">
                       Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-gray-900 bg-white"
                        disabled={otpSent}
                      >
                        <option value="+91">+91 (IN)</option>
                        <option value="+92">+92 (PK)</option>
                      </select>
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </span>
                        <input
                          id="mobile"
                          type="tel"
                          value={mobileNumber}
                          onChange={(e) => {
                            setMobileNumber(e.target.value);
                            if (fieldErrors.mobileNumber) setFieldErrors(prev => ({ ...prev, mobileNumber: '' }));
                          }}
                          onBlur={() => {
                            if (!mobileNumber && loginType === 'mobile') {
                              setFieldErrors(prev => ({ ...prev, mobileNumber: 'This field is required!' }));
                            } else if (mobileNumber && !validatePhone(mobileNumber) && loginType === 'mobile') {
                              setFieldErrors(prev => ({ ...prev, mobileNumber: 'Please enter a valid phone number (min 10 digits)' }));
                            }
                          }}
                          className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl outline-none transition-all placeholder-gray-400 ${
                            fieldErrors.mobileNumber 
                              ? 'border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-100' 
                              : 'border-gray-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-gray-900'
                          }`}
                          placeholder="9876543210"
                          disabled={otpSent}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRequestOTP}
                        disabled={loading || otpSent}
                        className="px-4 py-3 bg-brand-50 text-brand-600 font-bold rounded-xl hover:bg-brand-100 transition-all border-2 border-brand-200 disabled:opacity-50"
                      >
                        {otpSent ? 'Sent ✓' : 'Get OTP'}
                      </button>
                    </div>
                    {fieldErrors.mobileNumber && <p className="text-red-500 text-xs mt-1">{fieldErrors.mobileNumber}</p>}
                  </div>

                  {otpSent && (
                    <div className="animate-fade-in">
                      <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-2">
                        Enter 6-digit OTP
                      </label>
                      <input
                        id="otp"
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => {
                          setOtp(e.target.value.replace(/\D/g, ''));
                          if (fieldErrors.otp) setFieldErrors(prev => ({ ...prev, otp: '' }));
                        }}
                        onBlur={() => {
                          if (!otp && otpSent) {
                            setFieldErrors(prev => ({ ...prev, otp: 'This field is required!' }));
                          }
                        }}
                        className={`w-full px-4 py-3 border-2 rounded-xl text-center text-2xl tracking-widest font-bold outline-none transition-all ${
                          fieldErrors.otp 
                            ? 'border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-100' 
                            : 'border-gray-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-gray-900'
                        }`}
                        placeholder="••••••"
                        disabled={loading}
                      />
                      {fieldErrors.otp && <p className="text-red-500 text-xs mt-1 text-center">{fieldErrors.otp}</p>}
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setOtp(''); }}
                        className="mt-2 text-xs text-brand-600 hover:text-brand-700 font-semibold"
                      >
                        Change Number
                      </button>
                    </div>
                  )}
                </>
              )}

              <button
                type="submit"
                disabled={loading || (loginType === 'mobile' && !otpSent)}
                className="w-full py-3.5 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-500">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
                  Create one
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-brand-600 transition-colors flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
