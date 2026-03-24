'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { Loader, Button } from '../../components/common';
import { useToast } from '../../components/common/Toast';
import Link from 'next/link';
import { Plus, User, ArrowRight, Phone, Mail, CreditCard, Search, RefreshCw, Inbox } from 'lucide-react';
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

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const resetFilters = () => {
    setSearch('');
    setStatus('All');
    setCurrentPage(1);
  };

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

  const filteredChamps = champs.filter((c) => {
    const s = search.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(s) || c.mobileNumber.includes(s) || c.serviceArea.toLowerCase().includes(s);
    let matchesStatus = true;
    if (status === 'Active') matchesStatus = c.isActive !== false;
    if (status === 'Inactive') matchesStatus = c.isActive === false;
    return matchesSearch && matchesStatus;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredChamps.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredChamps.length / itemsPerPage);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const maxVisible = 3;
    let start = Math.max(1, currentPage - 1);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status]);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-3">
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

          {/* Ultra-Compact Filter Bar */}
          <div className="bg-white rounded-2xl p-2.5 mb-4 border border-gray-100 shadow-lg shadow-brand-500/5 flex flex-col gap-2.5 max-w-7xl mx-auto w-full overflow-hidden">
             <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                <div className="relative flex-1 w-full text-left">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500 opacity-40">
                    <Search size={14} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search name, phone, or location/pincode..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-100 rounded-xl text-[11px] font-bold text-gray-700 outline-none focus:bg-white focus:border-brand-500/20 transition-all"
                  />
                </div>
                
                <div className="w-full sm:w-48 flex gap-2">
                  <select 
                    className="w-full px-4 py-2 bg-gray-50/50 border border-gray-100 rounded-xl text-[11px] font-black uppercase tracking-widest focus:bg-white focus:border-brand-500/20 transition-all outline-none cursor-pointer"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <button 
                    onClick={resetFilters}
                    className="w-9 h-9 flex-shrink-0 bg-gray-50 text-gray-400 rounded-xl hover:bg-brand-50 hover:text-brand-600 transition-all flex items-center justify-center border border-gray-100 active:scale-95"
                    title="Reset"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
             </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Champion Info</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {currentItems.map((champ) => (
                        <tr key={champ._id} className="hover:bg-gray-50/30 transition-all group">
                          <td className="px-4 py-3 min-w-[300px] text-left">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 shadow-inner border border-white flex-shrink-0 overflow-hidden">
                                  {champ.profilePhoto ? (
                                    <img src={champ.profilePhoto} alt={champ.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <User size={24} />
                                  )}
                               </div>
                               <div className="min-w-0">
                                  <p className="font-black text-gray-900 mb-0.5 text-lg truncate">{champ.name}</p>
                                  <p className="text-[11px] text-brand-600 font-bold uppercase tracking-wider flex items-center gap-1.5 truncate">
                                     Partner
                                  </p>
                                </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                              champ.isActive !== false ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                            }`}>
                              {champ.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                             <div className="flex justify-center h-full">
                               <button 
                                  onClick={() => setSelectedChamp(champ)}
                                  className="flex items-center justify-center gap-2 w-full max-w-[120px] py-3 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-gray-200 active:scale-95 transition-all hover:bg-brand-600"
                               >
                                  Details <ArrowRight size={12} />
                               </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile View */}
              <div className="grid grid-cols-1 gap-2.5 md:hidden">
                {currentItems.map((champ) => (
                  <div 
                    key={champ._id} 
                    className={`bg-white rounded-[2rem] p-4 border-2 transition-all cursor-pointer shadow-sm group ${selectedChamp?._id === champ._id ? 'border-brand-500 ring-4 ring-brand-500/5 shadow-brand-500/10' : 'border-gray-100'}`}
                    onClick={() => setSelectedChamp(champ)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform duration-300 overflow-hidden shadow-inner">
                          {champ.profilePhoto ? (
                            <img src={champ.profilePhoto} alt={champ.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={28} />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-gray-900 leading-tight truncate max-w-[120px]">{champ.name}</h3>
                          <span className={`inline-block mt-0.5 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md ${
                            champ.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {champ.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <button 
                         className="px-4 py-2 bg-brand-50 text-brand-600 text-[11px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5 border border-brand-100 hover:bg-brand-100 active:scale-95 transition-all shadow-sm shrink-0"
                         onClick={(e) => { e.stopPropagation(); setSelectedChamp(champ); }}
                      >
                         Details <ArrowRight size={12} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-12 pb-8 flex justify-center">
                  <div className="flex items-center justify-center gap-3 px-4">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => paginate(currentPage - 1)}
                      className="w-10 h-10 flex-shrink-0 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-600 hover:border-brand-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm shadow-brand-500/5 group"
                    >
                      <ArrowRight size={20} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    
                    <div className="flex gap-2">
                      {getPageNumbers().map((number) => (
                        <button
                          key={number}
                          onClick={() => paginate(number)}
                          className={`w-10 h-10 flex-shrink-0 rounded-xl font-black text-xs transition-all tracking-tighter shadow-sm border ${
                            currentPage === number
                              ? 'bg-brand-600 text-white border-brand-600 shadow-brand-500/20 scale-110 z-10'
                              : 'bg-white text-gray-600 border-gray-100 hover:border-brand-200 hover:text-brand-600'
                          }`}
                        >
                          {number}
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => paginate(currentPage + 1)}
                      className="w-10 h-10 flex-shrink-0 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-600 hover:border-brand-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm shadow-brand-500/5 group"
                    >
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {filteredChamps.length === 0 && (
                <div className="bg-white rounded-[3rem] py-24 text-center border border-gray-100 shadow-xl shadow-gray-100/50 flex flex-col items-center mt-4">
                   <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center text-gray-300 mb-8 border border-white">
                      <Inbox size={40} />
                   </div>
                   <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">No Matching Results</h3>
                   <p className="text-gray-400 font-medium text-sm">Adjust your filters to find what you're looking for.</p>
                   {champs.length > 0 && (
                     <button onClick={resetFilters} className="mt-8 text-brand-600 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-3 transition-all">
                        Reset All Filters <RefreshCw size={14} />
                     </button>
                   )}
                </div>
              )}
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
