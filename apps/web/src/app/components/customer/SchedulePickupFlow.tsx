import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, DateTimePicker } from '../common';
import { useToast } from '../common/Toast';
import dynamic from 'next/dynamic';

const CustomerMap = dynamic(() => import('./CustomerMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-48 bg-gray-50 animate-pulse rounded-2xl flex items-center justify-center text-gray-400 font-bold">Loading Map...</div>
});

const scrapCategories = [
  { id: 'Paper', label: 'Paper', icon: '📄', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'Plastic Bottles', label: 'Plastic Bottles', icon: '🍾', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { id: 'Milk Covers', label: 'Milk Covers', icon: '🥛', color: 'bg-zinc-50 text-zinc-600 border-zinc-100' },
  { id: 'Metal', label: 'Metal', icon: '🔩', color: 'bg-purple-50 text-purple-600 border-purple-100' },
  { id: 'Others', label: 'Others', icon: '📦', color: 'bg-orange-50 text-orange-600 border-orange-100' },
];

export const SchedulePickupFlow: React.FC = () => {
  const router = useRouter();
  const { user, apiFetch } = useAuth();
  const [step, setStep] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customScrapTypes, setCustomScrapTypes] = useState('');
  const [formData, setFormData] = useState({
    itemWeights: {} as Record<string, string>,
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: 'any',
    address: user?.pickupAddress || '',
    location: null as { lat: number, lng: number } | null,
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Sync address from user profile when it becomes available
  useEffect(() => {
    if (user?.pickupAddress && !formData.address) {
      setFormData(prev => ({ ...prev, address: user.pickupAddress || '' }));
    }
  }, [user, formData.address]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
          
          // Get compressed base64
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
          // Fallback for non-image files (if any)
          const reader = new FileReader();
          reader.onloadend = () => {
            setCapturedImage(reader.result as string);
            showToast('File added successfully!', 'success');
          };
          reader.readAsDataURL(file);
        }
        setShowPhotoOptions(false);
      } catch (err) {
        showToast('Failed to process image', 'error');
      } finally {
        setLoading(false);
      }
    }
    // reset input value so selecting the same file triggers change repeatedly if needed
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
      // Map slot values to valid start hours for the Date object
      const timeMap: Record<string, string> = {
        'any': '09:00',
        '08-10': '08:00',
        '10-13': '10:00',
        '14-16': '14:00',
        '16-19': '16:00'
      };
      
      const timeValue = timeMap[formData.time] || formData.time;
      const scheduledAt = new Date(`${formData.date}T${timeValue}:00`);
      
      if (isNaN(scheduledAt.getTime())) {
        throw new Error('Invalid date or time selection');
      }

      const finalCategories = [...selectedCategories];
      if (selectedCategories.includes('Others') && customScrapTypes.trim()) {
        const customs = customScrapTypes.split(',').map(s => s.trim()).filter(Boolean);
        finalCategories.push(...customs);
      }

      // De-duplicate types
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

      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule');
      }

      setStep(4); // Move to success step
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10">
      <div className="flex-1">
        {/* Progress Header */}
        <div className="mb-12 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-4">
              {user?.pickupAddress ? `Welcome back, ${user.name.split(' ')[0]}! 👋` : "Let's Clean Up"}
            </h1>
            <p className="text-gray-500 font-medium text-lg flex flex-wrap items-center gap-2">
              {user?.pickupAddress ? (
                <>
                  Ready for another pickup? 
                  <span className="inline-flex items-center px-2 py-0.5 bg-brand-50 text-brand-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-brand-100 animate-pulse">
                    ⚡ Quick Start: Saved Address Loaded
                  </span>
                </>
              ) : (
                "Professional, eco-friendly scrap collection at your doorstep."
              )}
            </p>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => router.back()} 
            className="text-red-500 hover:text-red-600 hover:bg-red-50 border border-red-100 flex-shrink-0"
          >
            Cancel Pickup
          </Button>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-xl shadow-gray-200/50 border border-gray-100">
          
          {/* STEP 1: Capture Photo */}
          {step === 1 && (
            <div className="animate-fade-in text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 font-black mb-6 border border-brand-100">
                1
              </div>
              
              {!capturedImage ? (
                <>
                  <h2 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Show us what you're recycling</h2>
                  
                  <div 
                    onClick={() => {
                      if (isMobile) {
                        setShowPhotoOptions(true);
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    className="w-full max-w-sm mx-auto aspect-square bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 group hover:bg-gray-100 hover:border-brand-200 hover:shadow-xl transition-all cursor-pointer shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-transform mb-6 text-4xl relative z-10">
                      📷
                    </div>
                    <p className="font-bold text-gray-900 text-lg mb-2 relative z-10 transition-colors group-hover:text-brand-700">Add a photo of your scrap</p>
                    <p className="text-gray-400 text-sm font-medium relative z-10 transition-colors group-hover:text-brand-500">Tap to choose an option</p>
                  </div>

                  <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileUpload} className="hidden" />
                  <input type="file" accept="image/*, application/pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

                  {/* Photo Options Bottom Sheet */}
                  {showPhotoOptions && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowPhotoOptions(false)} />
                      <div className="bg-white w-full sm:w-[400px] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 relative z-10 animate-slide-up shadow-2xl">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8 sm:hidden" />
                        <h3 className="text-2xl font-black text-center mb-6 tracking-tight">Upload Photo</h3>
                        <div className="flex flex-col gap-3">
                          <button onClick={() => { cameraInputRef.current?.click(); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold transition-colors group">
                            <span className="flex items-center gap-4"><span className="text-2xl">📸</span> Take Photo</span>
                            <svg className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                          </button>
                          <button onClick={() => { fileInputRef.current?.click(); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold transition-colors group">
                            <span className="flex items-center gap-4"><span className="text-2xl">🖼️</span> Photo Library</span>
                            <svg className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                          </button>
                          <button onClick={() => { fileInputRef.current?.click(); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold transition-colors group">
                            <span className="flex items-center gap-4"><span className="text-2xl">📁</span> Choose File</span>
                            <svg className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </div>
                        <button onClick={() => setShowPhotoOptions(false)} className="w-full mt-6 py-4 text-center text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest text-sm font-black">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full max-w-md animate-scale-in">
                  <h2 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Check your photo</h2>
                  <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white mb-8 group">
                    <img src={capturedImage} alt="Captured Scrap" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                       </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button variant="ghost" fullWidth onClick={() => { setCapturedImage(null); showToast('Photo deleted', 'info'); }}>
                      Delete & Retake
                    </Button>
                    <Button variant="primary" fullWidth onClick={() => setStep(2)} rightIcon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    }>
                      Looks Good
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Categories */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 font-black border border-brand-100">
                  2
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">What are we recycling today?</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
                {scrapCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`
                      relative p-6 sm:p-8 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center gap-4 group
                      ${selectedCategories.includes(cat.id) 
                        ? 'border-brand-500 bg-brand-50/50 scale-[1.02] shadow-xl shadow-brand-500/10' 
                        : 'border-gray-50 bg-gray-50/50 hover:border-brand-200 hover:bg-white'}
                    `}
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-2 transition-transform group-hover:scale-110 ${cat.color}`}>
                      {cat.icon}
                    </div>
                    <span className="font-black uppercase tracking-widest text-[10px] text-gray-400">Category</span>
                    <span className={`font-black text-lg ${selectedCategories.includes(cat.id) ? 'text-brand-600' : 'text-gray-900'}`}>{cat.label}</span>
                    
                    {selectedCategories.includes(cat.id) && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white shadow-lg animate-scale-in">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {selectedCategories.includes('Others') && (
                <div className="mb-10 animate-fade-in animate-slide-up">
                  <Input 
                    label="Additional Scrap Types (Optional)" 
                    placeholder="e.g. Magazines, Textbooks, Old Clothes" 
                        value={customScrapTypes}
                        onChange={(e) => setCustomScrapTypes(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                 <div className="flex items-center gap-4">
                    <img src={capturedImage!} alt="Preview" className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white ring-4 ring-brand-500/10" />
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Captured Photo</p>
                      <button onClick={() => setStep(1)} className="text-sm font-bold text-brand-600 hover:text-brand-700">Retake Photo</button>
                    </div>
                 </div>
                 <Button onClick={() => setStep(3)} disabled={selectedCategories.length === 0} size="lg" className="sm:px-10">Next</Button>
              </div>
            </div>
          )}

          {/* STEP 3: Details */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="animate-fade-in">
               <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 font-black border border-brand-100">
                  3
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Pickup Details</h2>
              </div>

              <div className="mb-10 p-6 bg-brand-50/30 rounded-3xl border border-brand-100/50">
                <h3 className="text-lg font-black text-gray-900 mb-4">Estimated Weight (Optional)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {selectedCategories.map(cat => (
                    <Input 
                      key={cat}
                      label={`${cat} (kg)`} 
                      placeholder="e.g. 5" 
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.itemWeights[cat] || ''}
                      onChange={(e) => setFormData({...formData, itemWeights: {...formData.itemWeights, [cat]: e.target.value}})}
                      className="bg-white"
                    />
                  ))}
                  {selectedCategories.includes('Others') && customScrapTypes.split(',').map(s => s.trim()).filter(Boolean).map(customCat => (
                    <Input 
                      key={customCat}
                      label={`${customCat} (kg)`} 
                      placeholder="e.g. 2" 
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.itemWeights[customCat] || ''}
                      onChange={(e) => setFormData({...formData, itemWeights: {...formData.itemWeights, [customCat]: e.target.value}})}
                      className="bg-white"
                    />
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">

                <DateTimePicker 
                  label="Preferred Date" 
                  required
                  type="date"
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
                <DateTimePicker 
                  label="Preferred Time" 
                  required
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                />
              </div>

              <div className="mb-10">
                <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">
                  Pickup Address <span className="text-red-500">*</span>
                </label>
                <textarea 
                  className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-4 outline-none transition-all duration-200 placeholder:text-gray-400 placeholder:font-medium hover:border-brand-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 min-h-[120px]"
                  placeholder="Street name, Apartment, Landmark"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="mb-10">
                <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">
                  Tag Exact Location <span className="text-gray-400 text-xs font-medium">(Helps Champ find you faster)</span>
                </label>
                <CustomerMap 
                  location={formData.location} 
                  addressQuery={formData.address}
                  onChange={(loc) => setFormData(prev => ({ ...prev, location: loc }))} 
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <Button type="button" variant="ghost" onClick={() => setStep(2)} size="lg">Back to Categories</Button>
                <Button 
                  type="submit" 
                  fullWidth 
                  size="lg" 
                  variant="primary" 
                  disabled={loading}
                  leftIcon={
                    loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                      </svg>
                    )
                  }
                >
                  {loading ? 'Scheduling...' : 'Schedule Pickup Now'}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 4: Success Message */}
          {step === 4 && (
            <div className="animate-fade-in animate-scale-in flex flex-col items-center justify-center p-12 text-center bg-white rounded-[2.5rem]">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center text-5xl mb-8 shadow-inner animate-bounce border-4 border-emerald-50">
                🎉
              </div>
              <h1 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">
                Thank you for your order!
              </h1>
              <p className="text-xl text-gray-500 font-medium mb-12 max-w-sm leading-relaxed">
                We're finding your Scrap Champ and will confirm shortly.
              </p>
              <Button size="lg" onClick={() => router.push('/customer/pickups')} fullWidth className="max-w-xs shadow-xl shadow-brand-500/20">
                View My Pickups
              </Button>
            </div>
          )}

        </div>
      </div>

      {/* RIGHT SIDEBAR (Matching Image) */}
      <div className="lg:w-[380px] space-y-8">
        {/* Trust Card */}
        <div className="bg-brand-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-brand-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
             <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
             </svg>
          </div>
          <h3 className="text-2xl font-black mb-8 leading-tight relative z-10">Trust Your Scrap Champ</h3>
          <ul className="space-y-6 relative z-10">
            {[
              { title: 'Verified Partners', desc: 'Every collector is background-checked.' },
              { title: 'Digital Weighing', desc: 'Transparent and accurate scales.' },
              { title: 'Instant Payouts', desc: 'Get paid directly to your wallet.' },
            ].map((item, i) => (
              <li key={i} className="flex gap-4">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-lg leading-tight mb-1">{item.title}</p>
                  <p className="text-brand-100 text-sm">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Map Placeholder */}
        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm p-2">
          <div className="bg-brand-50 aspect-video rounded-[2rem] relative flex items-center justify-center grayscale">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-100/50 to-transparent" />
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-600 shadow-xl border-4 border-brand-500/20">
               📍
             </div>
          </div>
          <div className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-600 mb-2">Service Availability</p>
            <p className="text-gray-900 font-bold mb-1">Available in your area today</p>
            <p className="text-gray-500 text-sm font-bold"><span className="text-brand-600">12 </span>Collectors</p>
          </div>
        </div>

        {/* Testimonial */}
        <div className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 italic text-gray-500 font-medium">
          "Scheduling a pickup was so easy. The collector arrived right on time and was very professional. Love the eco-impact tracking!"
          <div className="mt-6 flex items-center gap-4 not-italic">
            <div className="w-10 h-10 bg-brand-200 rounded-full border-2 border-white shadow-sm" />
            <div>
              <p className="text-sm font-black text-gray-900 leading-none">Sarah Jenkins</p>
              <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mt-1">Active Recycler</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
