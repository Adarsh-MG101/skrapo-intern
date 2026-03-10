'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { Loader, Button, EmptyState } from '../../components/common';
import { useToast } from '../../components/common/Toast';
import Link from 'next/link';
import { Plus, User, ArrowRight, Phone, Mail, Search } from 'lucide-react';
import { CreateChampModal } from '../../components/admin/CreateChampModal';

interface Champ {
  _id: string;
  name: string;
  mobileNumber: string;
  email?: string;
  serviceArea: string;
  serviceRadiusKm?: number;
  createdAt?: string;
  profilePhoto?: string;
  panNumber?: string;
  aadharNumber?: string;
  gstNumber?: string;
}

export default function AdminChampsPage() {
  const { apiFetch } = useAuth();
  const { showToast } = useToast();
  const [champs, setChamps] = useState<Champ[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChamp, setSelectedChamp] = useState<Champ | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchChamps = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/orders/admin/scrap-champs');
      if (res.ok) {
        const data = await res.json();
        setChamps(data);
      } else {
        showToast('Failed to fetch champions', 'error');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChamps();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Manage Champions</h1>
              <p className="text-gray-500 font-medium">View and monitor your network of Scrap Champions.</p>
            </div>
            <Button 
              size="lg" 
              className="rounded-2xl shadow-lg shadow-brand-500/20 px-8 flex items-center gap-2"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={18} strokeWidth={3} /> New Champion
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : champs.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] py-20 border border-gray-100 shadow-sm">
                <EmptyState 
                    title="No Champions Found" 
                    description="You haven't registered any scrap champions yet." 
                    icon={User}
                />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* List Section */}
              <div className="lg:col-span-2 space-y-4">
                {champs.map((champ) => (
                  <div 
                    key={champ._id} 
                    className={`bg-white rounded-[2rem] p-6 border-2 transition-all cursor-pointer shadow-sm group ${selectedChamp?._id === champ._id ? 'border-brand-500 ring-4 ring-brand-500/5 shadow-brand-500/10' : 'border-transparent hover:border-gray-200'}`}
                    onClick={() => setSelectedChamp(champ)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                          {champ.profilePhoto ? (
                            <img src={champ.profilePhoto} alt={champ.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={28} />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-gray-900 leading-tight">{champ.name}</h3>
                          <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mt-1">Partner</p>
                        </div>
                      </div>
                      <div 
                         className="text-[11px] font-black text-gray-400 group-hover:text-brand-600 uppercase tracking-widest flex items-center gap-1 transition-colors"
                      >
                         Details <ArrowRight size={12} />
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="bg-gray-50/50 p-3 rounded-2xl">
                           <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Contact</p>
                           <p className="text-xs font-bold text-gray-700">{champ.mobileNumber}</p>
                        </div>
                        <div className="bg-gray-50/50 p-3 rounded-2xl">
                           <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Main Area</p>
                           <p className="text-xs font-bold text-gray-700 truncate" title={champ.serviceArea}>{champ.serviceArea}</p>
                        </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sidebar Detail Section */}
              <div className="lg:col-span-1">
                {selectedChamp ? (
                  <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/50 sticky top-10 animate-fade-in">
                    <div className="text-center mb-8">
                        <div className="w-24 h-24 bg-brand-50 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-4 border border-brand-100/50 shadow-inner overflow-hidden">
                            {selectedChamp.profilePhoto ? (
                              <img src={selectedChamp.profilePhoto} alt={selectedChamp.name} className="w-full h-full object-cover" />
                            ) : (
                              selectedChamp.name.charAt(0)
                            )}
                        </div>
                        <h2 className="text-2xl font-black text-gray-900">{selectedChamp.name}</h2>
                        <span className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100 mt-2">Active Partner</span>
                    </div>

                    <div className="space-y-6">
                        <div>
                           <label className="block text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2 px-1">Contact Details</label>
                           <div className="space-y-3">
                              <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                                 <Phone size={16} className="text-gray-400" />
                                 <p className="text-sm font-bold text-gray-800">{selectedChamp.mobileNumber}</p>
                              </div>
                              {selectedChamp.email && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                                   <Mail size={16} className="text-gray-400" />
                                   <p className="text-sm font-bold text-gray-800">{selectedChamp.email}</p>
                                </div>
                              )}
                           </div>
                        </div>

                        <div>
                           <label className="block text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2 px-1">Work Zone</label>
                           <div className="p-4 bg-brand-50/30 rounded-2xl border border-brand-100/50">
                              <p className="text-gray-900 font-bold mb-1">{selectedChamp.serviceArea}</p>
                              <p className="text-xs text-brand-600 font-medium tracking-tight">Operates within 10 km radius</p>
                           </div>
                        </div>

                        {selectedChamp.createdAt && (
                           <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-4">Joined on {new Date(selectedChamp.createdAt).toLocaleDateString()}</p>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                            <Link href={`/admin/champs/edit/${selectedChamp._id}`} className="block">
                                <Button variant="ghost" fullWidth className="!rounded-xl border-gray-200">Edit Info</Button>
                            </Link>
                            <Button variant="ghost" fullWidth className="!rounded-xl border-red-100 text-red-500 hover:bg-red-50">Deactivate</Button>
                        </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-[2.5rem] p-10 border-2 border-dashed border-gray-100 text-center flex flex-col items-center justify-center min-h-[400px] sticky top-10">
                     <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4 border border-gray-100">
                        <Search size={24} />
                     </div>
                     <p className="text-gray-400 font-bold max-w-[150px]">Select a champion to view deep insights.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <CreateChampModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            showToast('Champion created successfully!', 'success');
            fetchChamps();
          }} 
        />
      </div>
    </ProtectedRoute>
  );
}
