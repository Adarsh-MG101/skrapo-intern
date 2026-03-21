'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { Loader, Button, EmptyState } from '../../components/common';
import { useToast } from '../../components/common/Toast';
import Link from 'next/link';
import { Plus, User, ArrowRight, Phone, Mail, CreditCard } from 'lucide-react';
import { CreateChampModal } from '../../components/admin/CreateChampModal';
import { Modal } from '../../components/common/Modal';

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
  cardNumber?: string;
  isActive?: boolean;
}

export default function AdminChampsPage() {
  const { apiFetch, isLoading, isAuthenticated } = useAuth();
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

  const handleToggleStatus = async (champId: string, currentStatus: boolean) => {
    try {
      const endpoint = `/orders/admin/scrap-champs/${champId}/${currentStatus ? 'deactivate' : 'activate'}`;
      const res = await apiFetch(endpoint, { method: 'POST' });
      
      if (res.ok) {
        showToast(`Champion ${currentStatus ? 'deactivated' : 'activated'} successfully`, 'success');
        // Update local state to reflect change immediately
        setChamps(prevChamps => 
          prevChamps.map(c => 
            c._id === champId ? { ...c, isActive: !currentStatus } : c
          )
        );
        if (selectedChamp && selectedChamp._id === champId) {
          setSelectedChamp({ ...selectedChamp, isActive: !currentStatus });
        }
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Failed to update champion status', 'error');
      }
    } catch (err) {
      console.error('Toggle status error:', err);
      showToast('Connection error while updating status', 'error');
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      fetchChamps();
    }
  }, [isLoading, isAuthenticated]);

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
            <div className="space-y-4">
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
                    <button 
                       className="px-4 py-2 bg-brand-50 text-brand-600 text-[11px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5 border border-brand-100 hover:bg-brand-100 hover:border-brand-200 active:scale-95 transition-all shadow-sm"
                       onClick={(e) => { e.stopPropagation(); setSelectedChamp(champ); }}
                    >
                       Details <ArrowRight size={12} strokeWidth={3} />
                    </button>
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
          )}

          {/* Champion Detail Modal */}
          <Modal
            isOpen={!!selectedChamp}
            onClose={() => setSelectedChamp(null)}
            title="Champion Details"
            size="md"
            footer={
              selectedChamp ? (
                <div className="flex w-full gap-3">
                  <Link href={`/admin/champs/edit/${selectedChamp._id}`} className="flex-1">
                    <Button variant="ghost" fullWidth className="!rounded-xl border-gray-200">Edit Info</Button>
                  </Link>
                  {selectedChamp.isActive !== false ? (
                    <Button 
                      variant="ghost" 
                      fullWidth 
                      className="!rounded-xl border-red-100 text-red-500 hover:bg-red-50 flex-1"
                      onClick={() => {
                        handleToggleStatus(selectedChamp._id, true);
                        setSelectedChamp(null);
                      }}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      fullWidth 
                      className="!rounded-xl border-emerald-100 text-emerald-600 hover:bg-emerald-50 flex-1"
                      onClick={() => {
                        handleToggleStatus(selectedChamp._id, false);
                        setSelectedChamp(null);
                      }}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              ) : undefined
            }
          >
            {selectedChamp && (
              <div className="space-y-6">
                <div className="text-center mb-2">
                  <div className="w-24 h-24 bg-brand-50 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-4 border border-brand-100/50 shadow-inner overflow-hidden">
                    {selectedChamp.profilePhoto ? (
                      <img src={selectedChamp.profilePhoto} alt={selectedChamp.name} className="w-full h-full object-cover" />
                    ) : (
                      selectedChamp.name.charAt(0)
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">{selectedChamp.name}</h2>
                  {selectedChamp.isActive !== false ? (
                    <span className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100 mt-2">Active Partner</span>
                  ) : (
                    <span className="inline-block px-4 py-1.5 bg-red-50 text-red-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-red-100 mt-2">Inactive Partner</span>
                  )}
                </div>

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
                    {selectedChamp.cardNumber && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                        <CreditCard size={16} className="text-gray-400" />
                        <p className="text-sm font-bold text-gray-800">{selectedChamp.cardNumber}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2 px-1">Work Zone</label>
                  <div className="p-4 bg-brand-50/30 rounded-2xl border border-brand-100/50">
                    <p className="text-gray-900 font-bold mb-1">{selectedChamp.serviceArea}</p>
                    <p className="text-xs text-brand-600 font-medium tracking-tight">Operates within {selectedChamp.serviceRadiusKm || 10} km radius</p>
                  </div>
                </div>

                {selectedChamp.createdAt && (
                  <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-2">Joined on {new Date(selectedChamp.createdAt).toLocaleDateString()}</p>
                )}
              </div>
            )}
          </Modal>
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
