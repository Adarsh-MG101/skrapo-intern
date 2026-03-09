'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import ProtectedRoute from '../../../../components/common/ProtectedRoute';
import { Button, Input, Loader } from '../../../../components/common';
import { validatePhone, validateEmail, validatePincode } from '../../../../utils/validators';
import { AlertCircle, CheckCircle2, Eye, EyeOff, UserCircle, ArrowLeft, Save } from 'lucide-react';

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

function EditChampContent() {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobileNumber: '',
    countryCode: '+91',
    password: '',
    serviceArea: '',
    city: '',
    pincode: '',
    serviceRadiusKm: '10',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState('');
  const { apiFetch } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchChamp = async () => {
      try {
        const res = await apiFetch(`/orders/admin/scrap-champs/${id}`);
        if (res.ok) {
          const data = await res.json();
          
          // Parse service area: "Preferred Local Area, City - Pincode"
          let area = data.serviceArea || '';
          let city = '';
          let pincode = '';
          
          if (area.includes(' - ')) {
            const parts = area.split(' - ');
            pincode = parts[1];
            const areaParts = parts[0].split(', ');
            city = areaParts[areaParts.length - 1];
            area = areaParts.slice(0, -1).join(', ');
          }

          // Mobile number parsing
          let mobile = data.mobileNumber || '';
          let code = '+91';
          if (mobile.startsWith('+92')) {
            code = '+92';
            mobile = mobile.replace('+92', '');
          } else if (mobile.startsWith('+91')) {
            code = '+91';
            mobile = mobile.replace('+91', '');
          }

          setFormData({
            name: data.name || '',
            email: data.email || '',
            mobileNumber: mobile,
            countryCode: code,
            password: '', // Don't show password
            serviceArea: area,
            city: city,
            pincode: pincode,
            serviceRadiusKm: String(data.serviceRadiusKm || '10'),
          });
        } else {
          setError('Failed to load champion details');
        }
      } catch (err) {
        setError('Connection error');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchChamp();
  }, [id, apiFetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    let hasErrors = false;
    const newFieldErrors: Record<string, string> = {};

    if (!formData.name) {
      newFieldErrors.name = 'Full name is required';
      hasErrors = true;
    }

    if (!formData.mobileNumber) {
      newFieldErrors.mobileNumber = 'Mobile number is required';
      hasErrors = true;
    } else if (!validatePhone(formData.mobileNumber)) {
      newFieldErrors.mobileNumber = 'Please enter a valid phone number (min 10 digits)';
      hasErrors = true;
    }

    if (formData.email && !validateEmail(formData.email)) {
      newFieldErrors.email = 'Please enter a valid email address';
      hasErrors = true;
    }

    if (formData.password && formData.password.length < 6) {
      newFieldErrors.password = 'Password must be at least 6 characters';
      hasErrors = true;
    }

    if (!formData.serviceArea) {
      newFieldErrors.serviceArea = 'Service area is required';
      hasErrors = true;
    }

    if (!formData.city) {
      newFieldErrors.city = 'City selection is required';
      hasErrors = true;
    }

    if (!formData.pincode) {
      newFieldErrors.pincode = 'Pincode is required';
      hasErrors = true;
    } else if (!validatePincode(formData.pincode)) {
      newFieldErrors.pincode = 'Pincode must be exactly 6 digits';
      hasErrors = true;
    }

    if (hasErrors) {
      setFieldErrors(newFieldErrors);
      setError('Please fix the errors below.');
      return;
    }

    setSaving(true);
    setSuccess('');

    try {
      const combinedServiceArea = `${formData.serviceArea}, ${formData.city} - ${formData.pincode}`;
      const fullMobile = formData.countryCode + formData.mobileNumber.replace(/\D/g, '');
      
      const payload: any = {
        name: formData.name,
        email: formData.email,
        mobileNumber: fullMobile,
        serviceArea: combinedServiceArea,
        serviceRadiusKm: Number(formData.serviceRadiusKm),
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const response = await apiFetch(`/orders/admin/scrap-champs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess('Scrap Champion updated successfully! Redirecting...');
        setTimeout(() => {
          router.push('/admin/champs');
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update Scrap Champion');
      }
    } catch (err) {
      console.error('Update Champ Error:', err);
      setError('Connection error or invalid data.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 bg-gray-50/20 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <UserCircle className="text-brand-500" /> Edit Champion
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Update partner details and service area</p>
          </div>
          <button 
            onClick={() => router.back()}
            className="p-3 bg-white rounded-2xl border border-gray-100 text-gray-500 hover:text-brand-600 transition-all shadow-sm flex items-center gap-2 px-6 font-bold text-sm"
          >
            <ArrowLeft size={18} /> Back
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 font-bold text-sm flex items-center gap-3 animate-fade-in shadow-sm">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 font-bold text-sm flex items-center gap-3 animate-fade-in shadow-sm">
            <CheckCircle2 size={20} /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-gray-200/50 border border-gray-100 space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <Input 
              label="Full Name"
              required
              placeholder="e.g. Ramesh Kumar"
              value={formData.name}
              error={fieldErrors.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})}
            />
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.countryCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, countryCode: e.target.value }))}
                  className="px-3 py-3 border-2 border-gray-100 rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all text-gray-900 bg-white shadow-sm font-bold text-sm"
                >
                  <option value="+91">+91 (IN)</option>
                  <option value="+92">+92 (PK)</option>
                </select>
                <div className="flex-1">
                  <Input 
                    value={formData.mobileNumber}
                    placeholder="9876543210"
                    error={fieldErrors.mobileNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, mobileNumber: e.target.value.replace(/\D/g, '')})}
                    className="!py-[0.85rem]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Input 
              label="Email Address"
              type="email"
              placeholder="ramesh@example.com"
              value={formData.email}
              error={fieldErrors.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})}
            />
            <Input 
              label="New Password (optional)"
              type={showPassword ? 'text' : 'password'}
              placeholder="Leave blank to keep current"
              value={formData.password}
              error={fieldErrors.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, password: e.target.value})}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-brand-500 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-1">Logistics & Coverage</h2>
            <div className="space-y-6">
              <Input 
                label="Preferred Local Area"
                required
                placeholder="e.g. Sector 62, Indirapuram"
                value={formData.serviceArea}
                error={fieldErrors.serviceArea}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, serviceArea: e.target.value})}
              />

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">City *</label>
                  <select
                    className={`w-full bg-white border-2 rounded-2xl px-4 py-3.5 outline-none transition-all duration-200 cursor-pointer hover:border-brand-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-gray-900 font-bold ${fieldErrors.city ? 'border-red-500 focus:ring-red-500/10' : 'border-gray-100 shadow-sm'}`}
                    value={formData.city}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, city: e.target.value})}
                    required
                  >
                    {CITIES.map(city => (
                      <option key={city.value} value={city.value}>{city.label}</option>
                    ))}
                  </select>
                  {fieldErrors.city && <p className="mt-1.5 ml-1 text-sm font-semibold text-red-500">{fieldErrors.city}</p>}
                </div>
                <Input 
                  label="Pincode"
                  required
                  maxLength={6}
                  placeholder="6 digits"
                  value={formData.pincode}
                  error={fieldErrors.pincode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, pincode: e.target.value.replace(/\D/g, '')})}
                />
              </div>

              <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 shadow-inner">
                <label className="block text-sm font-bold text-gray-700 mb-4 ml-1">
                  Service Radius: <span className="text-brand-600 font-black">{formData.serviceRadiusKm} km</span>
                </label>
                <input 
                  type="range"
                  min="1"
                  max="50"
                  value={formData.serviceRadiusKm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, serviceRadiusKm: e.target.value})}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-black uppercase mt-3 px-1">
                  <span>1 km</span>
                  <span>50 km</span>
                </div>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            fullWidth 
            size="lg" 
            isLoading={saving}
            className="py-5 rounded-[1.5rem] shadow-xl shadow-brand-500/20 active:scale-95 transition-transform flex items-center justify-center gap-3"
          >
            <Save size={20} /> Save Changes
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function EditChampPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <EditChampContent />
    </ProtectedRoute>
  );
}
