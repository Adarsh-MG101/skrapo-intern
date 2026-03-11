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
  MessageSquare
} from 'lucide-react';

const CustomerMap = dynamic(() => import('./CustomerMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-48 bg-gray-50 animate-pulse rounded-2xl flex items-center justify-center text-gray-400 font-bold">Loading Map...</div>
});

const scrapCategories = [
  { id: 'Paper', label: 'Paper', Icon: FileText, color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'Plastic Bottles', label: 'Plastic Bottles', Icon: Droplets, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { id: 'Milk Covers', label: 'Milk Covers', Icon: Droplet, color: 'bg-zinc-50 text-zinc-600 border-zinc-100' },
  { id: 'Metal', label: 'Metal', Icon: Nut, color: 'bg-purple-50 text-purple-600 border-purple-100' },
  { id: 'Others', label: 'Others', Icon: Package, color: 'bg-orange-50 text-orange-600 border-orange-100' },
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
      const parsedWeights = Object.fromEntries(
         Object.entries(formData.itemWeights).map(([k, v]) => [k, parseFloat(v) || 0])
      );
      const totalWeight = Object.values(parsedWeights).reduce((sum, val) => sum + val, 0);

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
              className="px-6 py-2.5 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 transition-all font-black text-xs uppercase tracking-widest border border-red-50 flex items-center gap-2"
            >
              <Trash2 size={16} /> Cancel Pickup
            </button>
          )}
        </div>

        <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Package size={120} />
          </div>
          
          {step === 1 && (
            <div className="animate-fade-in text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 font-black mb-8 border border-brand-100 shadow-inner">
                1
              </div>
              
              {!capturedImage ? (
                <>
                  <h2 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Show us what you're recycling</h2>
                  
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
            <div className="animate-fade-in">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 font-black border border-brand-100 shadow-inner">2</div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Select Scrap Categories</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
                {scrapCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`relative p-6 sm:p-8 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center gap-4 group
                      ${selectedCategories.includes(cat.id) 
                        ? 'border-brand-500 bg-brand-50/50 scale-[1.02] shadow-xl shadow-brand-500/10' 
                        : 'border-gray-50 bg-gray-50/20 hover:border-brand-100 hover:bg-white'}`}
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 shadow-sm border border-black/5 ${cat.color}`}>
                      <cat.Icon size={32} />
                    </div>
                    <span className="font-black uppercase tracking-widest text-[10px] text-gray-400">Recyclable</span>
                    <span className={`font-black text-lg ${selectedCategories.includes(cat.id) ? 'text-brand-600' : 'text-gray-900'}`}>{cat.label}</span>
                    {selectedCategories.includes(cat.id) && (
                      <div className="absolute -top-3 -right-3 w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white shadow-xl animate-scale-in border-4 border-white">
                        <Check size={20} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
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
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 font-black border border-brand-100 shadow-inner">3</div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Pickup Logistics</h2>
              </div>

              <div className="mb-10 p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-6 flex items-center gap-2">
                   <Scale size={16} className="text-brand-500" /> Estimated Weights (kg)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {selectedCategories.map(cat => (
                    <Input 
                      key={cat} label={cat} placeholder="e.g. 5" type="number" min="0" step="0.1" value={formData.itemWeights[cat] || ''}
                      onChange={(e) => setFormData({...formData, itemWeights: {...formData.itemWeights, [cat]: e.target.value}})}
                      className="bg-white rounded-xl border-2"
                    />
                  ))}
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
                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1 flex items-center gap-2">
                   <MapPin size={16} className="text-brand-500" /> Detailed Address <span className="text-red-500">*</span>
                </label>
                <textarea 
                  className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 outline-none transition-all duration-200 placeholder:text-gray-300 placeholder:font-medium hover:border-brand-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 min-h-[140px] text-gray-900"
                  placeholder="Appartment, Street, Landmark details..."
                  value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="mb-12">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-1 flex items-center justify-between">
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
                  type="submit" fullWidth size="lg" variant="primary" disabled={loading}
                  className="rounded-xl shadow-xl shadow-brand-500/20"
                  leftIcon={loading ? <Loader size="sm" /> : <Clock size={20} />}
                >
                  {loading ? 'Scheduling...' : 'Finalize Pickup Booking'}
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
                Your request is being broadcasted to nearby Scrap Champs. Expect a confirmation soon.
              </p>
              <Button size="lg" onClick={() => router.push('/customer/pickups')} fullWidth className="max-w-xs shadow-xl shadow-brand-500/20 rounded-xl py-6 flex gap-3 text-lg">
                View My History <ArrowRight />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="lg:w-[380px] space-y-8 flex-shrink-0">
        <div className="bg-brand-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-brand-500/30 relative overflow-hidden group border border-brand-500">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700">
             <ShieldCheck size={160} />
          </div>
          <h3 className="text-2xl font-black mb-8 leading-tight relative z-10">Recycle My Bin Assurance</h3>
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

        <div className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 text-gray-500 font-medium relative italic group">
          <MessageSquare size={24} className="text-gray-200 absolute -top-4 -left-2" />
          "The most transparent way to recycle my household metal. The champ arrived exactly when promised."
          <div className="mt-8 flex items-center gap-4 not-italic">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl border-4 border-white shadow-sm flex items-center justify-center text-indigo-500 font-black">SJ</div>
            <div>
              <p className="text-sm font-black text-gray-900 leading-none mb-1">Sarah Jenkins</p>
              <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Platinum Member</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
