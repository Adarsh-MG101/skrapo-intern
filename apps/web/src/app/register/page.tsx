'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { validatePhone, validateEmail, validatePincode } from '../utils/validators';
import { 
  Recycle, 
  Home, 
  Globe, 
  Leaf, 
  User, 
  Phone, 
  Building2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  AlertCircle,
  LogOut
} from 'lucide-react';



const ROLES = [
  {
    code: 'customer',
    name: 'Customer',
    icon: <Home className="w-8 h-8 text-brand-500" />,
    description: 'Schedule scrap pickups from your doorstep',
    gradient: 'from-emerald-400 to-brand-500',
  },
];

const CITIES = [
  { label: 'Select City', value: '' },
  { label: 'Noida', value: 'Noida' },
  { label: 'Delhi', value: 'Delhi' },
  { label: 'Gurugram', value: 'Gurugram' },
  { label: 'Bangalore', value: 'Bangalore' },
  { label: 'Mumbai', value: 'Mumbai' },
  { label: 'Hyderabad', value: 'Hyderabad' },
  { label: 'Pune', value: 'Pune' },
  { label: 'Chennai', value: 'Chennai' },
  { label: 'Jaipur', value: 'Jaipur' },
];

function RegisterContent() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('customer');
  const [googleId, setGoogleId] = useState('');
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  
  
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { register, googleLogin, isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const registerAttempted = useRef(false);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && ROLES.some((r) => r.code === roleParam)) {
      setSelectedRole(roleParam);
    }

    // Check if we are finishing a Google registration
    const gId = searchParams.get('googleId');
    const gEmail = searchParams.get('email');
    const gName = searchParams.get('name');
    if (gId && gEmail && gName) {
      setGoogleId(gId);
      setEmail(gEmail);
      setName(gName);
      setIsGoogleAuth(true);
    }

    // Check if we are starting a registration from OTP
    const mNum = searchParams.get('mobileNumber');
    if (mNum) {
      setMobileNumber(mNum);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated && user && !registerAttempted.current) {
      setShowLogoutConfirm(true);
    }
  }, [isAuthenticated, user]);

  const handleConfirmLogout = () => {
    registerAttempted.current = false;
    logout();
    window.location.reload();
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
    window.history.forward();
    setTimeout(() => {
      router.replace(user?.defaultRoute || '/');
    }, 100);
  };

  const handleGoogleRegisterSuccess = async (credential: string) => {
    setLoading(true);
    setError('');
    const result = await googleLogin(credential);
    
    if (result.success) {
       if (result.needsPhone && result.googleData) {
         setGoogleId(result.googleData.googleId);
         setEmail(result.googleData.email);
         setName(result.googleData.name);
         setIsGoogleAuth(true);
       } else if (result.defaultRoute) {
         registerAttempted.current = true;
         router.push(result.defaultRoute);
       }
    } else {
      setError(result.error || 'Google registration failed');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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

    if (!email) {
      newFieldErrors.email = 'This field is required!';
      hasErrors = true;
    } else if (email && !validateEmail(email)) {
      newFieldErrors.email = 'Please enter a valid email address';
      hasErrors = true;
    }

    if (selectedRole === 'customer') {
      if (!addressLine) {
        newFieldErrors.addressLine = 'This field is required!';
        hasErrors = true;
      }
      if (!city) {
        newFieldErrors.city = 'This field is required!';
        hasErrors = true;
      }
      if (!pincode) {
        newFieldErrors.pincode = 'This field is required!';
        hasErrors = true;
      } else if (!validatePincode(pincode)) {
        newFieldErrors.pincode = 'Pincode must be exactly 6 digits';
        hasErrors = true;
      }
    }

    if (!isGoogleAuth) {
      if (!password) {
        newFieldErrors.password = 'This field is required!';
        hasErrors = true;
      } else if (password.length < 6) {
        newFieldErrors.password = 'Password must be at least 6 characters';
        hasErrors = true;
      }
      if (!confirmPassword) {
        newFieldErrors.confirmPassword = 'This field is required!';
        hasErrors = true;
      } else if (password !== confirmPassword) {
        newFieldErrors.confirmPassword = 'Passwords do not match';
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setLoading(true);

    const result = await register({
      name,
      email,
      mobileNumber: countryCode + mobileNumber.replace(/\D/g, ''),
      password: isGoogleAuth ? undefined : password,
      role: selectedRole,
      googleId: isGoogleAuth ? googleId : undefined,
      pickupAddress: selectedRole === 'customer' ? `${addressLine}, ${city} - ${pincode}` : undefined,
    });

    if (result.success && result.defaultRoute) {
      registerAttempted.current = true;
      router.push(result.defaultRoute);
    } else {
      setError(result.error || 'Registration failed');
    }

    setLoading(false);
  };

  if (showLogoutConfirm) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white animate-in fade-in duration-300">
        <div className="max-w-sm w-full p-8 border border-gray-100 rounded-3xl shadow-xl">
          <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner">
            <LogOut size={40} strokeWidth={2.5} />
          </div>
          
          <h3 className="text-2xl font-black text-gray-900 text-center mb-2">
            Sign Out?
          </h3>
          <p className="text-gray-500 text-center mb-8 leading-relaxed">
            You are currently logged in. Would you like to sign out before creating a new account?
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={handleConfirmLogout}
              className="w-full py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <LogOut size={20} />
              Yes, Sign Out
            </button>
            <button
              onClick={handleCancelLogout}
              className="w-full py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all active:scale-95"
            >
              Stay Logged In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-brand-400/20 rounded-full blur-2xl"></div>
        </div>
        <div className="relative text-center animate-fade-in">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-float backdrop-blur-sm">
            <Recycle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-4">Join Recycle My Bin</h1>
          <p className="text-brand-100 text-lg max-w-sm mx-auto leading-relaxed">
            Create your account and start making a difference. Every piece of scrap recycled counts!
          </p>
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              <Globe key="globe" className="w-8 h-8 text-white" />,
              <Recycle key="recycle" className="w-8 h-8 text-white" />,
              <Leaf key="leaf" className="w-8 h-8 text-white" />
            ].map((icon, i) => (
              <div
                key={i}
                className="h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm animate-fade-in"
                style={{ animationDelay: `${(i + 1) * 200}ms` }}
              >
                {icon}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
            <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center shadow-lg">
              <Recycle className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-800">Recycle My Bin</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-extrabold text-gray-900">
                {isGoogleAuth ? 'Finish Setup' : 'Create Account'}
              </h2>
              <p className="text-gray-500 mt-2">
                {isGoogleAuth ? 'Just a few more details' : 'Get started with Recycle My Bin today'}
              </p>
            </div>

            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {!isGoogleAuth && (
              <div className="mb-6">
                <div className="mb-6 flex justify-center">
                  <GoogleLogin
                    onSuccess={(credentialResponse) => {
                      if (credentialResponse.credential) {
                        handleGoogleRegisterSuccess(credentialResponse.credential);
                      }
                    }}
                    onError={() => {
                      setError('Google registration failed. Please try again.');
                    }}
                    theme="outline"
                    shape="rectangular"
                    width="250"
                    text="signup_with"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500 italic">or with details</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                    }}
                    onBlur={() => {
                      if (!name) setFieldErrors(prev => ({ ...prev, name: 'This field is required!' }));
                    }}
                    className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl outline-none transition-all placeholder-gray-400 ${
                      fieldErrors.name 
                        ? 'border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-100' 
                        : 'border-gray-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-gray-900'
                    }`}
                    placeholder="John Doe"
                    readOnly={isGoogleAuth}
                  />
                </div>
                {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
              </div>

              {/* Mobile Number */}
              <div>
                <label htmlFor="mobile" className="block text-sm font-semibold text-gray-700 mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-gray-900 bg-white"
                  >
                    <option value="+91">+91 (IN)</option>
                    <option value="+92">+92 (PK)</option>
                  </select>
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Phone className="w-5 h-5" />
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
                        if (!mobileNumber) {
                          setFieldErrors(prev => ({ ...prev, mobileNumber: 'This field is required!' }));
                        } else if (!validatePhone(mobileNumber)) {
                          setFieldErrors(prev => ({ ...prev, mobileNumber: 'Please enter a valid phone number (min 10 digits)' }));
                        }
                      }}
                      className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl outline-none transition-all placeholder-gray-400 ${
                        fieldErrors.mobileNumber 
                          ? 'border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-100' 
                          : 'border-gray-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-gray-900'
                      }`}
                      placeholder="9876543210"
                    />
                  </div>
                </div>
                {fieldErrors.mobileNumber && <p className="text-red-500 text-xs mt-1">{fieldErrors.mobileNumber}</p>}
              </div>

              {/* Role-specific Fields */}
              {selectedRole === 'customer' && (
                <div className="animate-fade-in space-y-4">
                  <div>
                    <label htmlFor="address-line" className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Address (House/Block, Street) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-4 text-gray-400">
                        <Building2 className="w-5 h-5" />
                      </span>
                  <textarea
                        id="address-line"
                        rows={3}
                        value={addressLine}
                        onChange={(e) => {
                          setAddressLine(e.target.value);
                          if (fieldErrors.addressLine) setFieldErrors(prev => ({ ...prev, addressLine: '' }));
                        }}
                        onBlur={() => {
                          if (!addressLine) setFieldErrors(prev => ({ ...prev, addressLine: 'This field is required!' }));
                        }}
                        className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl outline-none transition-all placeholder-gray-400 resize-none ${
                          fieldErrors.addressLine 
                            ? 'border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-100' 
                            : 'border-gray-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-gray-900'
                        }`}
                        placeholder="e.g. A-123, Sunrise Apartments"
                      />
                    </div>
                    {fieldErrors.addressLine && <p className="text-red-500 text-xs mt-1">{fieldErrors.addressLine}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                        City <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="city"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          if (fieldErrors.city) setFieldErrors(prev => ({ ...prev, city: '' }));
                        }}
                        onBlur={() => {
                          if (!city) setFieldErrors(prev => ({ ...prev, city: 'This field is required!' }));
                        }}
                        className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all ${
                          fieldErrors.city 
                            ? 'border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-100' 
                            : 'border-gray-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-gray-900'
                        }`}
                      >
                        {CITIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.city && <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>}
                    </div>

                    <div>
                      <label htmlFor="pincode" className="block text-sm font-semibold text-gray-700 mb-2">
                        Pincode <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="pincode"
                        type="text"
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => {
                          setPincode(e.target.value.replace(/\D/g, ''));
                          if (fieldErrors.pincode) setFieldErrors(prev => ({ ...prev, pincode: '' }));
                        }}
                        onBlur={() => {
                          if (!pincode) {
                            setFieldErrors(prev => ({ ...prev, pincode: 'This field is required!' }));
                          } else if (!validatePincode(pincode)) {
                            setFieldErrors(prev => ({ ...prev, pincode: 'Pincode must be exactly 6 digits' }));
                          }
                        }}
                        className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all placeholder-gray-400 ${
                          fieldErrors.pincode 
                            ? 'border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-100' 
                            : 'border-gray-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-gray-900'
                        }`}
                        placeholder="6 digits"
                      />
                      {fieldErrors.pincode && <p className="text-red-500 text-xs mt-1">{fieldErrors.pincode}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="mt-4">
                <label htmlFor="reg-email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    id="reg-email"
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
                    readOnly={isGoogleAuth}
                  />
                </div>
                {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
              </div>

              {!isGoogleAuth && (
                <>
                  {/* Password */}
                  <div>
                    <label htmlFor="reg-password" className="block text-sm font-semibold text-gray-700 mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Lock className="w-5 h-5" />
                      </span>
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                        }}
                        onBlur={() => {
                          if (!password) {
                            setFieldErrors(prev => ({ ...prev, password: 'This field is required!' }));
                          } else if (password.length < 6) {
                            setFieldErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }));
                          }
                        }}
                        className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl outline-none transition-all placeholder-gray-400 ${
                          fieldErrors.password 
                            ? 'border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-100' 
                            : 'border-gray-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-gray-900'
                        }`}
                        placeholder="Min 6 characters"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Lock className="w-5 h-5" />
                      </span>
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                        }}
                        onBlur={() => {
                          if (!confirmPassword) {
                            setFieldErrors(prev => ({ ...prev, confirmPassword: 'This field is required!' }));
                          } else if (password !== confirmPassword) {
                            setFieldErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
                          }
                        }}
                        className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl outline-none transition-all placeholder-gray-400 ${
                          fieldErrors.confirmPassword 
                            ? 'border-red-500 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-100' 
                            : 'border-gray-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-gray-900'
                        }`}
                        placeholder="Repeat your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>}
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {isGoogleAuth ? 'Completing Setup...' : 'Creating Account...'}
                  </>
                ) : (
                  isGoogleAuth ? 'Complete Setup' : 'Create Account'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-500">
                Already have an account?{' '}
                <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
                  Sign In
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-brand-600 transition-colors flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
