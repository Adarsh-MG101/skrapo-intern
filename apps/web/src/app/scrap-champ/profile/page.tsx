
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute, Loader, Button, Input } from '../../components/common';
import { useToast } from '../../components/common/Toast';
import { 
  User, 
  Mail, 
  MapPin, 
  Phone, 
  IdCard, 
  Camera, 
  Upload, 
  ShieldCheck,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building
} from 'lucide-react';
import Link from 'next/link';

interface FormData {
  [key: string]: any;
  name: string;
  email: string;
  pickupAddress: string;
  serviceArea: string;
  serviceRadiusKm: number;
  panNumber: string;
  aadharNumber: string;
  gstNumber: string;
  panCardPic: string;
  aadharCardPic: string;
  gstCardPic: string;
  profilePhoto: string;
  cardNumber: string;
}

function ScrapChampProfileContent() {
  const { user, apiFetch, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: user?.name || '',
    email: user?.email || '',
    pickupAddress: user?.pickupAddress || '',
    serviceArea: user?.serviceArea || '',
    serviceRadiusKm: user?.serviceRadiusKm || 5,
    panNumber: user?.panNumber || '',
    aadharNumber: user?.aadharNumber || '',
    gstNumber: user?.gstNumber || '',
    panCardPic: user?.panCardPic || '',
    aadharCardPic: user?.aadharCardPic || '',
    gstCardPic: user?.gstCardPic || '',
    profilePhoto: user?.profilePhoto || '',
    cardNumber: user?.cardNumber || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        pickupAddress: user.pickupAddress || '',
        serviceArea: user.serviceArea || '',
        serviceRadiusKm: user.serviceRadiusKm || 5,
        panNumber: user.panNumber || '',
        aadharNumber: user.aadharNumber || '',
        gstNumber: user.gstNumber || '',
        panCardPic: user.panCardPic || '',
        aadharCardPic: user.aadharCardPic || '',
        gstCardPic: user.gstCardPic || '',
        profilePhoto: user.profilePhoto || '',
        cardNumber: user.cardNumber || '',
      });
    }
  }, [user]);

  const fileInputRefs = {
    profile: useRef<HTMLInputElement>(null),
    pan: useRef<HTMLInputElement>(null),
    aadhar: useRef<HTMLInputElement>(null),
    gst: useRef<HTMLInputElement>(null),
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setFormData(prev => ({ ...prev, [fieldName]: compressed }));
        showToast('Photo optimized and added!', 'success');
      } catch (err) {
        showToast('Failed to process image', 'error');
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast('Profile updated successfully!', 'success');
        refreshUser();
      } else {
        const error = await res.json();
        showToast(error.message || 'Failed to update profile', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const DocCard = ({ title, field, picField, numberField, icon: Icon, placeholder }: any) => (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-500 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
            <Icon size={24} />
          </div>
          <div>
            <h3 className="font-black text-gray-900 leading-none mb-1">{title}</h3>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Verification Document</p>
          </div>
        </div>
        {formData[picField] ? (
          <div className="flex items-center gap-1 text-emerald-600 font-black text-[10px] bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
             <CheckCircle2 size={12} /> UPLOADED
          </div>
        ) : (
          <div className="flex items-center gap-1 text-amber-600 font-black text-[10px] bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
             <AlertCircle size={12} /> MISSING
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Input 
          label={`${title} Number`}
          placeholder={placeholder}
          name={numberField}
          value={formData[numberField]}
          onChange={handleInputChange}
          className="bg-gray-50/50 border-gray-100 px-5 rounded-2xl"
        />

        {formData[picField] ? (
          <div className="relative group/pic aspect-video rounded-2xl overflow-hidden border border-gray-100">
            <img src={formData[picField]} alt={title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/pic:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button 
                variant="ghost" 
                className="bg-white hover:bg-red-50 text-red-600 border-none p-3 rounded-xl"
                onClick={() => setFormData(prev => ({ ...prev, [picField]: '' }))}
              >
                <Trash2 size={20} />
              </Button>
            </div>
          </div>
        ) : (
          <button 
            type="button"
            onClick={() => (fileInputRefs as any)[field].current?.click()}
            className="w-full aspect-video border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600 transition-all group/btn"
          >
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover/btn:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <p className="font-black text-xs uppercase tracking-widest">Upload Image</p>
            <input 
              type="file" 
              className="hidden" 
              ref={(fileInputRefs as any)[field]} 
              accept="image/*"
              onChange={(e) => handleFileUpload(e, picField)}
            />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/30 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-4 sm:py-6 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <Link href="/scrap-champ">
              <Button variant="ghost" className="p-2 sm:p-3 rounded-2xl bg-gray-50 text-gray-500 hover:bg-brand-50 hover:text-brand-600 border-none transition-all">
                <ArrowLeft size={20} className="sm:w-5 sm:h-5 w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tighter truncate">My <span className="text-brand-600">Profile</span></h1>
          </div>
          <Button 
            variant="primary" 
            className="px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg shadow-brand-500/20 text-xs sm:text-sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader size="sm" /> : 'Save Changes'}
          </Button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
          
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm text-center relative overflow-hidden group">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-6">
                <div className="w-full h-full rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden bg-gray-50 border-4 border-white shadow-xl">
                  {formData.profilePhoto ? (
                    <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100">
                      <User size={64} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => fileInputRefs.profile.current?.click()}
                  className="absolute -bottom-2 -right-2 w-10 h-10 sm:w-12 sm:h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all border-4 border-white"
                >
                  <Camera size={20} />
                </button>
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRefs.profile} 
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'profilePhoto')}
                />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">{user?.name}</h2>
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest bg-gray-50 px-4 py-2 rounded-full inline-block">Scrap Champion</p>
              
              <div className="mt-8 space-y-4 text-left">
                <div className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                  <div className="w-8 h-8 flex items-center justify-center text-brand-600 bg-white rounded-xl shadow-sm">
                    <Phone size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] uppercase font-black text-gray-400 tracking-wider">Mobile Number</p>
                    <p className="text-sm font-black text-gray-900 truncate">{user?.mobileNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-brand-50/50 rounded-3xl border border-brand-100 text-center">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-600 mx-auto mb-4 shadow-sm border border-brand-100">
                <ShieldCheck size={28} />
              </div>
              <h3 className="font-black text-brand-900 text-sm mb-1 uppercase tracking-tight">Trust & Safety</h3>
              <p className="text-[10px] text-brand-600 font-bold leading-relaxed px-4">Your documents are securely stored and only used for identity verification.</p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8 sm:space-y-12">
            
            <section>
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                   <User size={20} />
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">General Information</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Input 
                  label="Full Name" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  leftIcon={<User size={18} />}
                  className="bg-white border-gray-100 px-5 rounded-2xl shadow-sm"
                />
                <Input 
                  label="Email Address" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  leftIcon={<Mail size={18} />}
                  className="bg-white border-gray-100 px-5 rounded-2xl shadow-sm"
                />
                <div className="sm:col-span-2">
                  <Input 
                    label="Current Service Address" 
                    name="pickupAddress"
                    value={formData.pickupAddress}
                    onChange={handleInputChange}
                    leftIcon={<MapPin size={18} />}
                    className="bg-white border-gray-100 px-5 rounded-2xl shadow-sm"
                  />
                </div>
                <Input 
                  label="Specific Service Area" 
                  name="serviceArea"
                  placeholder="e.g. Indiranagar, 560038"
                  value={formData.serviceArea}
                  onChange={handleInputChange}
                  leftIcon={<Building size={18} />}
                  className="bg-white border-gray-100 px-5 rounded-2xl shadow-sm"
                />
                <Input 
                  label="Radius (km)" 
                  name="serviceRadiusKm"
                  type="number"
                  value={formData.serviceRadiusKm}
                  onChange={handleInputChange}
                  leftIcon={<MapPin size={18} />}
                  className="bg-white border-gray-100 px-5 rounded-2xl shadow-sm"
                />
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                   <IdCard size={20} />
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Verification Documents</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                <DocCard 
                  title="PAN Card" 
                  field="pan" 
                  picField="panCardPic" 
                  numberField="panNumber" 
                  icon={IdCard} 
                  placeholder="Enter 10-digit PAN"
                />
                <DocCard 
                  title="Aadhar Card" 
                  field="aadhar" 
                  picField="aadharCardPic" 
                  numberField="aadharNumber" 
                  icon={ShieldCheck} 
                  placeholder="Enter 12-digit Aadhar"
                />
                <div className="md:col-span-2">
                  <DocCard 
                    title="GST Registration (Optional)" 
                    field="gst" 
                    picField="gstCardPic" 
                    numberField="gstNumber" 
                    icon={Building} 
                    placeholder="Enter GSTIN Number"
                  />
                </div>
              </div>
            </section>
          </div>

        </div>
      </main>
    </div>
  );
}

export default function ScrapChampProfilePage() {
  return (
    <ProtectedRoute allowedRoles={['scrapChamp']}>
      <ScrapChampProfileContent />
    </ProtectedRoute>
  );
}
