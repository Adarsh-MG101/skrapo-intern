'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button, Input } from '../common';
import { validatePhone, validateEmail, validatePincode } from '../../utils/validators';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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

interface CreateChampModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateChampModal: React.FC<CreateChampModalProps> = ({ isOpen, onClose, onSuccess }) => {
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
    panNumber: '',
    panCardPic: null as string | null,
    aadharNumber: '',
    aadharCardPic: null as string | null,
    gstNumber: '',
    gstCardPic: null as string | null,
    profilePhoto: null as string | null,
    cardNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const { apiFetch } = useAuth();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        email: '',
        mobileNumber: '',
        countryCode: '+91',
        password: '',
        serviceArea: '',
        city: '',
        pincode: '',
        serviceRadiusKm: '10',
        panNumber: '',
        panCardPic: null,
        aadharNumber: '',
        aadharCardPic: null,
        gstNumber: '',
        gstCardPic: null,
        profilePhoto: null,
        cardNumber: '',
      });
      setError('');
      setFieldErrors({});
    }
  }, [isOpen]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      try {
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file);
          setFormData(prev => ({ ...prev, [field]: compressed }));
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            setFormData(prev => ({ ...prev, [field]: reader.result as string }));
          };
          reader.readAsDataURL(file);
        }
      } catch (err) {
        console.error('File compression error:', err);
        setError('Failed to process image');
      } finally {
        setLoading(false);
      }
    }
  };

  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      formData.mobileNumber.length >= 10 &&
      validatePhone(formData.mobileNumber) &&
      formData.password.length >= 6 &&
      formData.serviceArea.trim() !== '' &&
      formData.city !== '' &&
      formData.pincode.length === 6 &&
      validatePincode(formData.pincode) &&
      (formData.email === '' || validateEmail(formData.email))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const combinedServiceArea = `${formData.serviceArea}, ${formData.city} - ${formData.pincode}`;
      const fullMobile = formData.countryCode + formData.mobileNumber.replace(/\D/g, '');
      
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          mobileNumber: fullMobile,
          password: formData.password,
          role: 'scrapChamp',
          serviceArea: combinedServiceArea,
          serviceRadiusKm: Number(formData.serviceRadiusKm),
          panNumber: formData.panNumber,
          panCardPic: formData.panCardPic,
          aadharNumber: formData.aadharNumber,
          aadharCardPic: formData.aadharCardPic,
          gstNumber: formData.gstNumber,
          gstCardPic: formData.gstCardPic,
          profilePhoto: formData.profilePhoto,
          cardNumber: formData.cardNumber,
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create Scrap Champion');
      }
    } catch (err) {
      console.error('Create Champ Error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Create New Champion"
      size="lg"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 font-bold text-sm flex items-center gap-3 animate-fade-in shadow-sm">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Input 
              label="Full Name"
              required
              placeholder="e.g. Ramesh Kumar"
              value={formData.name}
              error={fieldErrors.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="px-4 py-3 border-2 border-gray-100 rounded-2xl bg-gray-50 text-gray-500 font-bold text-sm flex items-center justify-center min-w-[70px] shadow-sm">
                  +91
                </div>
                <div className="flex-1">
                  <Input 
                    value={formData.mobileNumber}
                    placeholder="9876543210"
                    error={fieldErrors.mobileNumber}
                    onChange={(e) => setFormData({...formData, mobileNumber: e.target.value.replace(/\D/g, '')})}
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
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
            <Input 
              label="Password"
              required
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 6 characters"
              value={formData.password}
              error={fieldErrors.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
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
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Identity & Verification</h2>
            
            <div className="space-y-6">
               {/* Profile Photo */}
               <div className="flex flex-col items-center gap-4 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                  <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-gray-300">
                    {formData.profilePhoto ? (
                      <img src={formData.profilePhoto} alt="Profile preview" className="w-full h-full object-cover" />
                    ) : (
                      <Eye size={40} className="opacity-20" />
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <span className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-600 hover:bg-gray-50 transition-colors shadow-sm uppercase tracking-widest">
                      {formData.profilePhoto ? 'Change Photo' : 'Upload Profile Photo'}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'profilePhoto')} />
                  </label>
               </div>

               {/* Aadhar */}
               <div className="grid md:grid-cols-2 gap-6 items-end">
                  <Input 
                    label="Aadhar Card Number (Optional)"
                    placeholder="12-digit Aadhar number"
                    maxLength={12}
                    value={formData.aadharNumber}
                    onChange={(e) => setFormData({...formData, aadharNumber: e.target.value.replace(/\D/g, '')})}
                  />
                  <label className="flex-1 cursor-pointer">
                    <div className={`px-4 py-3.5 border-2 border-dashed rounded-2xl text-center transition-all ${formData.aadharCardPic ? 'border-emerald-200 bg-emerald-50 text-emerald-600 font-bold' : 'border-gray-100 hover:border-brand-200 text-gray-400 font-medium'}`}>
                       <span className="text-xs uppercase tracking-widest">{formData.aadharCardPic ? '✅ Aadhar Card Added' : '➕ Upload Aadhar Card'}</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'aadharCardPic')} />
                  </label>
               </div>

               {/* PAN */}
               <div className="grid md:grid-cols-2 gap-6 items-end">
                  <Input 
                    label="PAN Card Number (Optional)"
                    placeholder="PAN number (e.g. ABCDE1234F)"
                    maxLength={10}
                    className="uppercase"
                    value={formData.panNumber}
                    onChange={(e) => setFormData({...formData, panNumber: e.target.value.toUpperCase()})}
                  />
                  <label className="flex-1 cursor-pointer">
                    <div className={`px-4 py-3.5 border-2 border-dashed rounded-2xl text-center transition-all ${formData.panCardPic ? 'border-emerald-200 bg-emerald-50 text-emerald-600 font-bold' : 'border-gray-100 hover:border-brand-200 text-gray-400 font-medium'}`}>
                       <span className="text-xs uppercase tracking-widest">{formData.panCardPic ? '✅ PAN Card Added' : '➕ Upload PAN Card'}</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'panCardPic')} />
                  </label>
               </div>

               {/* GST */}
               <div className="grid md:grid-cols-2 gap-6 items-end">
                  <Input 
                    label="GST Number (Optional)"
                    placeholder="GSTIN"
                    maxLength={15}
                    className="uppercase"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({...formData, gstNumber: e.target.value.toUpperCase()})}
                  />
                  <label className="flex-1 cursor-pointer">
                    <div className={`px-4 py-3.5 border-2 border-dashed rounded-2xl text-center transition-all ${formData.gstCardPic ? 'border-emerald-200 bg-emerald-50 text-emerald-600 font-bold' : 'border-gray-100 hover:border-brand-200 text-gray-400 font-medium'}`}>
                       <span className="text-xs uppercase tracking-widest">{formData.gstCardPic ? '✅ GST Certificate Added' : '➕ Upload GST Certificate'}</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'gstCardPic')} />
                  </label>
               </div>
               
               {/* Card Number */}
               <div className="grid md:grid-cols-2 gap-6 items-end">
                  <Input 
                    label="Worker ID / Card Number (Optional)"
                    placeholder="Enter official Scrapo ID"
                    value={formData.cardNumber}
                    onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
                  />
               </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Logistics & Coverage</h2>
            <div className="space-y-6">
              <Input 
                label="Preferred Local Area"
                required
                placeholder="e.g. Sector 62, Indirapuram"
                value={formData.serviceArea}
                error={fieldErrors.serviceArea}
                onChange={(e) => setFormData({...formData, serviceArea: e.target.value})}
              />

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">City <span className="text-red-500">*</span></label>
                  <select
                    className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3.5 outline-none transition-all duration-200 cursor-pointer hover:border-brand-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-gray-900 font-bold shadow-sm"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                  >
                    {CITIES.map(city => (
                      <option key={city.value} value={city.value}>{city.label}</option>
                    ))}
                  </select>
                </div>
                <Input 
                  label="Pincode"
                  required
                  maxLength={6}
                  placeholder="6 digits"
                  value={formData.pincode}
                  error={fieldErrors.pincode}
                  onChange={(e) => setFormData({...formData, pincode: e.target.value.replace(/\D/g, '')})}
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
                  onChange={(e) => setFormData({...formData, serviceRadiusKm: e.target.value})}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            fullWidth 
            size="lg" 
            isLoading={loading}
            disabled={!isFormValid() || loading}
            className="py-5 rounded-[1.5rem] shadow-xl shadow-brand-500/20 active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            Register Scrap Champion
          </Button>
        </form>
      </div>
    </Modal>
  );
};
