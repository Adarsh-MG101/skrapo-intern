import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, DateTimePicker, Loader } from '../common';
import { useToast } from '../common/Toast';
import dynamic from 'next/dynamic';
import { CameraCapture } from './CameraCapture';
import { 
  FileText, 
  Droplets, 
  Droplet, 
  Nut, 
  Package, 
  PartyPopper, 
  Camera,
  Video, 
  MapPin, 
  Hand,
  ShieldCheck,
  Scale,
  Wallet,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Clock,
  Trash2,
  Check,
  ChevronRight,
  ChevronLeft,
  Cpu,
  Battery,
  Box,
  Search,
  X,
  Zap
} from 'lucide-react';

const CustomerMap = dynamic(() => import('./CustomerMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-48 bg-gray-50 animate-pulse rounded-2xl flex items-center justify-center text-gray-400 font-bold">Loading Map...</div>
});

const scrapCategories = [
  { id: 'Paper', label: 'Paper', Icon: FileText, color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'Newspaper', label: 'Newspaper', Icon: FileText, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  { id: 'Cardboard', label: 'Cardboard', Icon: Box, color: 'bg-amber-50 text-amber-600 border-amber-100' },
  { id: 'Plastic Bottles', label: 'Plastic Bottles', Icon: Droplets, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { id: 'Hard Plastic', label: 'Hard Plastic', Icon: Droplets, color: 'bg-teal-50 text-teal-600 border-teal-100' },
  { id: 'Milk Covers', label: 'Milk Covers', Icon: Droplet, color: 'bg-zinc-50 text-zinc-600 border-zinc-100' },
  { id: 'Iron/Steel', label: 'Iron/Steel', Icon: Nut, color: 'bg-slate-50 text-slate-600 border-slate-100' },
  { id: 'Aluminum', label: 'Aluminum', Icon: Nut, color: 'bg-gray-50 text-gray-600 border-gray-100' },
  { id: 'Copper', label: 'Copper', Icon: Nut, color: 'bg-orange-50 text-orange-600 border-orange-100' },
  { id: 'Brass', label: 'Brass', Icon: Nut, color: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
  { id: 'E-Waste', label: 'E-Waste', Icon: Cpu, color: 'bg-rose-50 text-rose-600 border-rose-100' },
  { id: 'Battery', label: 'Battery', Icon: Battery, color: 'bg-red-50 text-red-600 border-red-100' },
  { id: 'Glass Bottles', label: 'Glass Bottles', Icon: Droplet, color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
  { id: 'Others', label: 'Others', Icon: Package, color: 'bg-orange-50 text-orange-600 border-orange-100' },
];

const flowSteps = [
  { id: 1, label: 'Photos', icon: Camera },
  { id: 2, label: 'Items', icon: Package },
  { id: 3, label: 'Details', icon: MapPin },
  { id: 4, label: 'Done', icon: PartyPopper },
];

export const SchedulePickupFlow: React.FC = () => {
  const router = useRouter();
  const { user, apiFetch } = useAuth();
  const [step, setStep] = useState(1);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customScrapTypes, setCustomScrapTypes] = useState('');
  const [formData, setFormData] = useState({
    itemWeights: {} as Record<string, string>,
    date: (() => {
      const now = new Date();
      const dayEnd = new Date(now);
      dayEnd.setHours(15, 30, 0, 0);

      // If it's past 3:30 PM, default to tomorrow
      if (now.getTime() >= dayEnd.getTime()) {
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
      return now.toISOString().split('T')[0];
    })(),
    time: 'any',
    address: user?.pickupAddress || '',
    location: null as { lat: number, lng: number } | null,
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentTotalWeight = Object.values(formData.itemWeights).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

  useEffect(() => {
    if (user?.pickupAddress && !initializedRef.current) {
      setFormData(prev => ({ ...prev, address: user.pickupAddress || '' }));
      initializedRef.current = true;
    }
  }, [user]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    const isToday = formData.date === new Date().toISOString().split('T')[0];
    if (isToday) {
      const now = new Date();
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const currentHour = twoHoursLater.getHours();
      
      const slotEndHour = formData.time.includes('-') ? parseInt(formData.time.split('-')[1]) : null;
      
      if (slotEndHour !== null && currentHour >= slotEndHour) {
        setFormData(prev => ({ ...prev, time: '' }));
      } else if (formData.time === 'any' && currentHour >= 19) {
        setFormData(prev => ({ ...prev, time: '' }));
      }
    }
  }, [formData.date]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      try {
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file);
          setCapturedImage(compressed);
          showToast('Photo optimized and added!', 'success');
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            setCapturedImage(reader.result as string);
            showToast('File added successfully!', 'success');
          };
          reader.readAsDataURL(file);
        }
      } catch (err) {
        showToast('Failed to process image', 'error');
      } finally {
        setLoading(false);
      }
    }
    e.target.value = '';
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.time || !formData.address) {
      showToast('Please fill in date, time, and address', 'error');
      return;
    }

    setLoading(true);
    try {
      const timeMap: Record<string, string> = {
        'any': '09:00',
        '08-10': '08:00',
        '10-13': '10:00',
        '14-16': '14:00',
        '16-19': '16:00'
      };
      
      const endTimeMap: Record<string, string> = {
        'any': '19:00',
        '08-10': '10:00',
        '10-13': '13:00',
        '14-16': '16:00',
        '16-19': '19:00'
      };
      
      const timeValue = timeMap[formData.time] || formData.time;
      const endTimeValue = endTimeMap[formData.time] || formData.time;
      const scheduledAt = new Date(`${formData.date}T${timeValue}:00`);
      const slotEndTime = new Date(`${formData.date}T${endTimeValue}:00`);
      
      if (isNaN(scheduledAt.getTime())) {
        throw new Error('Invalid date or time selection');
      }

      // 2-hour window check relative to the slot's *end* time
      const earliestPickupTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      if (slotEndTime.getTime() < earliestPickupTime.getTime() - 60000) { // 1 min grace
        throw new Error('Pickup must be scheduled at least 2 hours from now');
      }

      // Push scheduledAt to the earliest valid pickup time if the start is in the past/buffer
      if (scheduledAt.getTime() < earliestPickupTime.getTime()) {
        scheduledAt.setTime(earliestPickupTime.getTime());
      }

      const finalCategories = [...selectedCategories];
      if (selectedCategories.includes('Others') && customScrapTypes.trim()) {
        const customs = customScrapTypes.split(',').map(s => s.trim()).filter(Boolean);
        finalCategories.push(...customs);
      }

      const uniqueTypes = Array.from(new Set(finalCategories));
      
      // Mandatory Weight Check: Every selected category must have a weight entered
      const missingWeights = selectedCategories.filter(cat => !formData.itemWeights[cat] || parseFloat(formData.itemWeights[cat]) < 0.1);
      if (missingWeights.length > 0) {
        throw new Error(`Please enter weights for all items: ${missingWeights.join(', ')}`);
      }

      const parsedWeights = Object.fromEntries(
         Object.entries(formData.itemWeights).map(([k, v]) => [k, parseFloat(v) || 0])
      );
      const totalWeight = Object.values(parsedWeights).reduce((sum, val) => sum + val, 0);

      if (totalWeight < 10) {
        throw new Error('Total estimated weight must be at least 10kg');
      }

      const payload = {
        scrapTypes: uniqueTypes,
        estimatedWeight: { items: parsedWeights, total: totalWeight },
        photoUrl: capturedImage,
        scheduledAt: scheduledAt.toISOString(),
        timeSlot: formData.time,
        exactAddress: formData.address,
        location: formData.location,
      };

      const res = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule');
      setStep(4);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10">
      <div className="flex-1 min-w-0">
        <div className="mb-12 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-4 flex items-center gap-3">
              {user?.pickupAddress ? (
                <>Welcome back, <span className="text-brand-600">{user.name.split(' ')[0]}</span>! <Hand className="text-brand-500" /></>
              ) : "Let's Clean Up"}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-gray-500 font-medium text-lg leading-tight">
                {user?.pickupAddress ? "Ready for another pickup?" : "Eco-friendly scrap collection at your doorstep."}
              </p>
              {user?.pickupAddress && (
                <span className="inline-flex items-center px-3 py-1 bg-brand-50 text-brand-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-brand-100 animate-pulse gap-1.5 shadow-sm">
                  <Sparkles size={12} fill="currentColor" /> Quick Start: Profile Loaded
                </span>
              )}
            </div>
          </div>
          {step !== 1 && step !== 4 && (
            <button 
              onClick={() => {
                setStep(1);
                setCapturedImage(null);
                setSelectedCategories([]);
                setCustomScrapTypes('');
                setFormData(prev => ({
                  ...prev,
                  itemWeights: {},
                  location: null
                }));
              }} 
              className="mx-auto sm:mx-0 px-6 py-2.5 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 transition-all font-black text-xs uppercase tracking-widest border border-red-50 flex items-center gap-2"
            >
              <Trash2 size={16} /> Cancel Pickup
            </button>
          )}
        </div>

        <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Package size={120} />
          </div>

          {/* Stepper Logic */}
          <div className="mb-12 relative">
            <div className="flex items-center justify-between relative max-w-2xl mx-auto px-4">
              {/* Progress Line */}
              <div className="absolute top-[20px] left-10 right-10 h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
              <div 
                className="absolute top-[20px] left-10 h-0.5 bg-brand-500 -translate-y-1/2 z-0 transition-all duration-700 ease-in-out" 
                style={{ width: `calc(${((step - 1) / (flowSteps.length - 1)) * 100}% - ${step === 1 ? '0%' : '0%'})`, right: '10px' }}
              />
              
              {flowSteps.map((s) => {
                const isCompleted = step > s.id;
                const isActive = step === s.id;
                const Icon = s.icon;
                
                return (
                  <div key={s.id} className="relative z-10 flex flex-col items-center group">
                    <div className={`
                      w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 border-2
                      ${isCompleted ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/20' : 
                        isActive ? 'bg-white border-brand-500 text-brand-600 shadow-xl shadow-brand-500/10 scale-110' : 
                        'bg-white border-gray-100 text-gray-400'}
                    `}>
                      {isCompleted ? <Check size={18} strokeWidth={3} className="animate-scale-in" /> : <Icon size={18} />}
                    </div>
                    <span className={`
                      mt-3 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-500
                      ${isActive ? 'text-brand-600' : isCompleted ? 'text-brand-500' : 'text-gray-400'}
                      hidden sm:block
                    `}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {step === 1 && (
            <div className="animate-fade-in text-center flex flex-col items-center">
              
              {!capturedImage ? (
                <>
                  <h2 className="text-3xl font-black text-gray-900 mb-8 tracking-tight">Show us what you're recycling</h2>
                  
                  {showCamera ? (
                    <div className="w-full max-w-md mx-auto animate-scale-in">
                      <CameraCapture 
                        onCapture={(imageSrc) => {
                          setCapturedImage(imageSrc);
                          setShowCamera(false);
                          showToast('Photo captured successfully!', 'success');
                        }}
                        onCancel={() => setShowCamera(false)}
                      />
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-4">Point your camera at the scrap items</p>
                    </div>
                  ) : (
                    <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-[4/3] bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 group hover:bg-gray-100 hover:border-brand-200 hover:shadow-xl transition-all cursor-pointer shadow-sm relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-transform mb-6 text-brand-500 relative z-10">
                          <Camera size={40} strokeWidth={2.5} />
                        </div>
                        <p className="font-bold text-gray-900 text-lg mb-2 relative z-10 transition-colors group-hover:text-brand-700">Upload a photo</p>
                        <p className="text-gray-400 text-sm font-medium relative z-10">Tap to browse files</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="w-full py-4 bg-gray-900 text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] border border-gray-700"
                      >
                        <Video size={20} /> Use Live Camera
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setStep(2)}
                        className="w-full py-4 text-gray-400 hover:text-gray-600 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 group"
                      >
                         Skip for now <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  )}
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                </>
              ) : (
                <div className="w-full max-w-md animate-scale-in">
                  <h2 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Does this look correct?</h2>
                  <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white mb-8 group bg-gray-100">
                    <img src={capturedImage} alt="Captured Scrap" className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                       <span className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                          <Check size={14} className="text-emerald-400" strokeWidth={3} /> Photo Verified
                       </span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button variant="ghost" fullWidth onClick={() => { setCapturedImage(null); showToast('Photo deleted', 'info'); }} className="rounded-xl flex gap-2">
                      <Trash2 size={18} /> Delete
                    </Button>
                    <Button variant="primary" fullWidth onClick={() => setStep(2)} className="rounded-xl shadow-lg shadow-brand-500/20" rightIcon={<ArrowRight size={20} />}>
                      Looks Good
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in relative">
              <div className="flex items-center gap-4 mb-10">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Select Scrap Categories</h2>
              </div>
              
              {/* Custom Multi-select Dropdown */}
              <div className="relative mb-8" ref={dropdownRef}>
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`
                    w-full bg-white border-2 rounded-[1.5rem] p-5 flex items-center justify-between cursor-pointer transition-all duration-300
                    ${isDropdownOpen ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-gray-100 hover:border-brand-200'}
                  `}
                >
                  <div className="flex items-center gap-4 text-gray-400">
                    <Search size={22} className={isDropdownOpen ? 'text-brand-500' : ''} />
                    <span className={`font-bold ${isDropdownOpen ? 'text-gray-900' : 'text-gray-400'}`}>
                       {selectedCategories.length > 0 ? `${selectedCategories.length} Categories Selected` : 'Search or pick scrap items...'}
                    </span>
                  </div>
                  <ChevronRight size={20} className={`text-gray-300 transition-transform duration-300 ${isDropdownOpen ? 'rotate-90 text-brand-500' : ''}`} />
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-50 mt-4 w-full bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden animate-scale-in">
                    <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                      <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          autoFocus
                          type="text"
                          placeholder="Type to filter categories..."
                          className="w-full bg-white border-2 border-gray-100 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-brand-300 transition-all font-bold text-sm"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto p-3 scrollbar-hide">
                      {scrapCategories
                        .filter(cat => cat.label.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((cat) => (
                          <div 
                            key={cat.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory(cat.id);
                            }}
                            className={`
                              flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all mb-1 group
                              ${selectedCategories.includes(cat.id) 
                                ? 'bg-brand-50 text-brand-600' 
                                : 'hover:bg-gray-50 text-gray-700'}
                            `}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2.5 rounded-xl ${cat.color} bg-white shadow-sm transition-transform group-hover:scale-110`}>
                                <cat.Icon size={20} />
                              </div>
                              <span className="font-extrabold text-lg">{cat.label}</span>
                            </div>
                            {selectedCategories.includes(cat.id) ? (
                              <div className="w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center text-white">
                                <Check size={14} strokeWidth={4} />
                              </div>
                            ) : (
                              <div className="w-6 h-6 border-2 border-gray-100 rounded-full group-hover:border-brand-200 transition-colors" />
                            )}
                          </div>
                        ))}
                      {scrapCategories.filter(cat => cat.label.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                        <div className="p-10 text-center">
                          <Zap size={40} className="mx-auto text-gray-200 mb-4" />
                          <p className="text-gray-400 font-bold">No matching categories found</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Categories Tags */}
              <div className="flex flex-wrap gap-3 mb-12 min-h-[40px]">
                {selectedCategories.map(catId => {
                  const cat = scrapCategories.find(c => c.id === catId);
                  if (!cat) return null;
                  return (
                    <div 
                      key={cat.id}
                      className="flex items-center gap-3 px-5 py-2.5 bg-white border-2 border-brand-100 text-brand-700 rounded-2xl animate-scale-in shadow-sm hover:shadow-md transition-shadow"
                    >
                      <cat.Icon size={18} />
                      <span className="font-black text-sm uppercase tracking-wider">{cat.label}</span>
                      <button 
                        onClick={() => toggleCategory(cat.id)}
                        className="p-1 hover:bg-brand-100 rounded-full transition-colors text-brand-400 hover:text-brand-600"
                      >
                        <X size={16} strokeWidth={3} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {selectedCategories.includes('Others') && (
                <div className="mb-10 animate-fade-in">
                  <Input 
                    label="Additional Item Types" 
                    placeholder="e.g. Cardboard, Copper wire, etc." 
                    value={customScrapTypes}
                    onChange={(e) => setCustomScrapTypes(e.target.value)}
                    className="bg-white rounded-2xl border-2"
                  />
                </div>
              )}

              <div className="flex justify-between items-center bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl flex gap-2">
                   <ArrowLeft size={18} /> Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={selectedCategories.length === 0} size="lg" className="px-12 rounded-xl shadow-lg shadow-brand-500/20" rightIcon={<ChevronRight size={20} />}>
                   Next Details
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} className="animate-fade-in">
              <div className="flex items-center gap-4 mb-10">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Pickup Logistics</h2>
              </div>

              <div className="mb-10 p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-6 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Scale size={16} className="text-brand-500" /> Estimated Weights (kg)
                   </div>
                   <span className="text-brand-600 lowercase font-medium">Min 10kg total required</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {selectedCategories.map(cat => (
                    <Input 
                      key={cat} label={cat} placeholder="e.g. 5" type="number" min="0.1" step="0.1" required
                      value={formData.itemWeights[cat] || ''}
                      onChange={(e) => setFormData({...formData, itemWeights: {...formData.itemWeights, [cat]: e.target.value}})}
                      className="bg-white rounded-xl border-2"
                    />
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Estimated Weight</p>
                    <p className={`text-2xl font-black transition-colors ${currentTotalWeight >= 10 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {currentTotalWeight.toFixed(1)} kg
                    </p>
                  </div>
                  {currentTotalWeight < 10 && (
                    <div className="text-right animate-pulse">
                       <p className="text-[10px] font-bold text-amber-500 uppercase tracking-tight">Requirement Unmet</p>
                       <p className="text-xs text-gray-400 font-medium whitespace-nowrap">Add { (10 - currentTotalWeight).toFixed(1) }kg more to proceed</p>
                    </div>
                  )}
                  {currentTotalWeight >= 10 && (
                    <div className="text-right">
                       <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight">Minimum Met</p>
                       <p className="text-xs text-gray-400 font-medium whitespace-nowrap">You can now proceed</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-10">
                <DateTimePicker 
                  label="Preferred Date" required type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
                <DateTimePicker 
                  label="Preferred Time" required type="time"
                  isToday={formData.date === new Date().toISOString().split('T')[0]}
                  value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})}
                />
              </div>

              <div className="mb-10">
                <label className="text-sm font-bold text-gray-700 mb-2 ml-1 flex items-center gap-2">
                   <MapPin size={16} className="text-brand-500" /> Detailed Address <span className="text-red-500">*</span>
                </label>
                <textarea 
                  className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 outline-none transition-all duration-200 placeholder:text-gray-300 placeholder:font-medium hover:border-brand-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 min-h-[140px] text-gray-900"
                  placeholder="Appartment, Street, Landmark details..."
                  value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="mb-12">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-1 flex items-center justify-between">
                   <span>Pin Exact Location</span>
                   <span className="text-brand-600 lowercase font-medium">Verified using Map Services</span>
                </label>
                <CustomerMap location={formData.location} addressQuery={formData.address} onChange={(loc, address) => setFormData(prev => ({ ...prev, location: loc, ...(address ? { address } : {}) }))} />
              </div>

              <div className="flex flex-col md:flex-row gap-4 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                <Button type="button" variant="ghost" onClick={() => setStep(2)} className="flex gap-2 rounded-xl">
                   <ChevronLeft size={20} /> Categories
                </Button>
                <Button 
                  type="submit" fullWidth size="lg" variant="primary" disabled={loading || currentTotalWeight < 10}
                  className="rounded-xl shadow-xl shadow-brand-500/20"
                  leftIcon={loading ? <Loader size="sm" /> : <Clock size={20} />}
                >
                  {currentTotalWeight < 10 ? `Need ${(10 - currentTotalWeight).toFixed(1)}kg more` : (loading ? 'Scheduling...' : 'Finalize Pickup Booking')}
                </Button>
              </div>
            </form>
          )}

          {step === 4 && (
            <div className="animate-fade-in animate-scale-in flex flex-col items-center justify-center p-12 text-center bg-white rounded-[2.5rem]">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mb-8 shadow-inner animate-bounce border-2 border-emerald-100 relative">
                <PartyPopper size={48} />
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white border-4 border-white">
                   <Check size={24} strokeWidth={3} />
                </div>
              </div>
              <h1 className="text-4xl font-black text-gray-900 mb-6 tracking-tight">Order Received!</h1>
              <p className="text-xl text-gray-500 font-medium mb-12 max-w-sm leading-relaxed">
                Your request is being broadcasted to nearby Scrap Champs. Expect a confirmation in 30 minutes .
              </p>
              <Button size="lg" onClick={() => router.push('/customer/pickups')} fullWidth className="max-w-xs shadow-xl shadow-brand-500/20 rounded-xl py-6 flex gap-3 text-lg">
                View My History <ArrowRight />
              </Button>
            </div>
          )}

          {/* Support Footer */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center animate-fade-in">
            <p className="text-gray-400 text-sm font-medium">
              For any assistance, please contact us at   <a href="tel:+917975136270" className="text-brand-600 font-bold hover:underline">+917975136270</a>
            </p>
          </div>
        </div>
      </div>

      <div className="lg:w-[380px] space-y-8 flex-shrink-0">
        <div className="bg-brand-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-brand-500/30 relative overflow-hidden group border border-brand-500">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700">
             <ShieldCheck size={160} />
          </div>
          <h3 className="text-2xl font-black mb-8 leading-tight relative z-10">Recyclemybin Assurance</h3>
          <ul className="space-y-8 relative z-10">
            {[
              { title: 'Verified Network', desc: 'Background-checked partners only.', Icon: ShieldCheck },
              { title: 'Digital Precision', desc: 'Pre-calibrated weighing metrics.', Icon: Scale },
              { title: 'Direct Payments', desc: 'Secure cash or digital transfers.', Icon: Wallet },
            ].map((item, i) => (
              <li key={i} className="flex gap-4">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/20">
                  <item.Icon size={20} />
                </div>
                <div>
                  <p className="font-extrabold text-lg leading-tight mb-1">{item.title}</p>
                  <p className="text-brand-100 text-sm font-medium leading-snug">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm p-2 group hover:shadow-lg transition-all">
          <div className="bg-gray-50 aspect-video rounded-[2rem] relative flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 bg-brand-500/5 group-hover:bg-transparent transition-colors" />
             <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-brand-600 shadow-xl border-4 border-brand-50 group-hover:scale-110 transition-transform relative z-10">
               <MapPin size={28} />
             </div>
             <div className="absolute top-4 left-4 flex gap-1">
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-brand-200 rounded-full" />
             </div>
          </div>
          <div className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-600 mb-2">Network Status</p>
            <p className="text-gray-900 font-black text-lg mb-1 leading-tight">Live Coverage Active</p>
            <p className="text-gray-400 text-sm font-bold flex items-center gap-2">
               Ready in <span className="text-brand-600 text-base font-black">12-15</span> minutes
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
