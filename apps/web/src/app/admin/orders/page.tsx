'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { StatusBadge, Loader, Button, CustomSelect } from '../../components/common';
import { useToast } from '../../components/common/Toast';
import { User, Inbox, Zap, Ban, Phone, FileText, Layers, Droplets, Cpu, Package, Recycle, ArrowRight, Timer } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

const getTimeSlotLabel = (slot: string) => {
  if (slot.includes('-')) return slot;
  const labels: { [key: string]: string } = {
    'morning': '09:00 AM - 12:00 PM',
    'afternoon': '12:00 PM - 03:30 PM',
    'evening': '03:30 PM - 06:30 PM'
  };
  return labels[slot] || slot;
};

const ExpiryTimer = ({ createdAt }: { createdAt: string }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculate = () => {
      const expiry = new Date(createdAt).getTime() + 30 * 60 * 1000;
      const diff = Math.max(0, expiry - Date.now());
      setTimeLeft(diff);
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  if (timeLeft === 0) return null;

  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  const isUrgent = timeLeft <= 10 * 60 * 1000;

  return (
    <div className="flex items-center gap-1">
      {isUrgent && (
        <span className="text-[7px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded-md uppercase tracking-widest animate-pulse">
          Needs Attention
        </span>
      )}
      <span className={`flex items-center gap-1 font-black px-1.5 py-0.5 rounded-md border text-[9px] tracking-tight ${
        isUrgent 
          ? 'text-red-600 bg-red-50 border-red-200' 
          : 'text-red-500 bg-red-50 border-red-100/50'
      }`}>
        <Timer size={10} />
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  );
};

interface Order {
  _id: string;
  scrapTypes: string[];
  scheduledAt: string;
  timeSlot?: string;
  status: string;
  exactAddress: string;
  customerDetails: {
    name: string;
    mobileNumber: string;
  };
  assignedScrapChampId: string | null;
  notifiedChampsCount?: number;
  viewCount?: number;
  declinedChampIds?: string[];
  createdAt: string;
  champDetails?: {
    name: string;
  };
}

export default function AdminOrdersPage() {
  const { apiFetch, isLoading, isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [engagementModal, setEngagementModal] = useState<{ isOpen: boolean; orderId: string | null; data: any }>({
    isOpen: false,
    orderId: null,
    data: null
  });
  const [loadingEngagement, setLoadingEngagement] = useState(false);

  // Manual Assignment State
  const [assignModal, setAssignModal] = useState({
    isOpen: false,
    loading: false,
    champs: [] as any[],
    selectedChampId: '',
    selectedOrderId: '',
    submitting: false
  });

  const fetchEngagement = async (orderId: string) => {
    setLoadingEngagement(true);
    setEngagementModal(prev => ({ ...prev, isOpen: true, orderId, data: null }));
    try {
      const res = await apiFetch(`/orders/admin/${orderId}/engagement`);
      if (res.ok) {
        const data = await res.json();
        setEngagementModal(prev => ({ ...prev, data }));
      }
    } catch (err) {
      console.error('Engagement fetch error:', err);
    } finally {
      setLoadingEngagement(false);
    }
  };

  const openAssignModal = async (orderId: string) => {
    setAssignModal(prev => ({ ...prev, isOpen: true, loading: true, selectedOrderId: orderId }));
    try {
      const res = await apiFetch('/orders/admin/scrap-champs');
      if (res.ok) {
        const champs = await res.json();
        const activeChamps = champs.filter((c: any) => c.isActive !== false);
        setAssignModal(prev => ({ ...prev, champs: activeChamps, loading: false }));
      }
    } catch (err) {
      showToast('Failed to fetch champs', 'error');
      setAssignModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleManualAssign = async () => {
    if (!assignModal.selectedChampId || !assignModal.selectedOrderId) return;
    setAssignModal(prev => ({ ...prev, submitting: true }));
    try {
      const res = await apiFetch(`/orders/admin/${assignModal.selectedOrderId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ champId: assignModal.selectedChampId })
      });
      if (res.ok) {
        showToast('Champion assigned successfully!', 'success');
        setAssignModal(prev => ({ ...prev, isOpen: false, submitting: false, selectedChampId: '', selectedOrderId: '' }));
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Assignment failed', 'error');
        setAssignModal(prev => ({ ...prev, submitting: false }));
      }
    } catch (err) {
      showToast('Assignment error', 'error');
      setAssignModal(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleBroadcast = async (orderId: string) => {
    try {
      const res = await apiFetch(`/orders/admin/${orderId}/broadcast`, { method: 'POST' });
      if (res.ok) {
        showToast('Broadcast initiated successfully', 'success');
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Broadcast failed', 'error');
      }
    } catch (err) {
      showToast('Error triggering broadcast', 'error');
    }
  };

  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchData = async () => {
    try {
      const res = await apiFetch('/orders/admin');
      if (res.ok) {
        const allOrders: Order[] = await res.json();
        const liveOrders = allOrders.filter(o => {
          const isExpired = o.status === 'Requested' && (new Date(o.createdAt).getTime() + 30 * 60 * 1000 <= Date.now());
          return !isExpired && ['Requested', 'Assigned', 'Accepted', 'Arrived', 'Arriving', 'Picking', 'Problem'].includes(o.status);
        });
         const sortedLiveOrders = liveOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
         setOrders(sortedLiveOrders);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'Active') return ['Assigned', 'Accepted', 'Arrived', 'Arriving', 'Picking'].includes(o.status);
    if (statusFilter === 'Requested') return o.status === 'Requested';
    if (statusFilter === 'Problem') return o.status === 'Problem';
    return true; // 'All'
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

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
  }, [statusFilter]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      fetchData();
    }
  }, [isLoading, isAuthenticated, apiFetch]);

  useEffect(() => {
    if (!socket) return;

    const handleRefresh = () => {
      fetchData();
    };

    socket.on('new_pickup_request', handleRefresh);
    socket.on('pickup_cancelled', handleRefresh);
    socket.on('order_accepted', handleRefresh);
    socket.on('order_declined', handleRefresh);
    socket.on('order_completed', handleRefresh);
    socket.on('broadcast_exhausted', handleRefresh);
    socket.on('order_needs_attention', handleRefresh);
    socket.on('order_critical', handleRefresh);

    return () => {
      socket.off('new_pickup_request', handleRefresh);
      socket.off('pickup_cancelled', handleRefresh);
      socket.off('order_accepted', handleRefresh);
      socket.off('order_declined', handleRefresh);
      socket.off('order_completed', handleRefresh);
      socket.off('broadcast_exhausted', handleRefresh);
      socket.off('order_needs_attention', handleRefresh);
      socket.off('order_critical', handleRefresh);
    };
  }, [socket]);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-2 md:p-6 bg-gray-50/30 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                 Allocation Center <Zap className="text-brand-500 fill-brand-500" size={24} />
              </h1>
              <p className="text-xs text-gray-500 font-medium">Real-time pickup broadcasts and engagement.</p>
            </div>

             <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
                {['All', 'Requested', 'Active', 'Problem'].map((f) => (
                   <button
                     key={f}
                     onClick={() => setStatusFilter(f)}
                     className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest transition-all whitespace-nowrap ${
                       statusFilter === f 
                         ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/10 scale-[1.02]' 
                         : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                     }`}
                   >
                     {f}
                   </button>
                ))}
             </div>
           </div>

           {loading ? (
             <div className="flex justify-center py-20">
               <Loader size="lg" />
             </div>
           ) : (
             <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentItems.length === 0 ? (
                <div className="col-span-full bg-white rounded-[2.5rem] py-24 text-center border border-gray-100 shadow-sm flex flex-col items-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-200 mb-4 border border-gray-100">
                    <Inbox size={40} />
                  </div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Queue Clear</p>
                </div>
              ) : (
                currentItems.map((order) => {
                  const material = order.scrapTypes[0] || 'Scrap';
                  const isExpired = order.status === 'Requested' && (new Date(order.createdAt).getTime() + 30 * 60 * 1000 <= Date.now());
                  
                  // Icon Logic
                  let Icon = Recycle;
                  let iconBg = 'bg-gray-50';
                  let iconColor = 'text-gray-500';
                  
                  if (material.toLowerCase().includes('paper')) { Icon = FileText; iconBg = 'bg-blue-50'; iconColor = 'text-blue-500'; }
                  else if (material.toLowerCase().includes('metal')) { Icon = Layers; iconBg = 'bg-slate-50'; iconColor = 'text-slate-500'; }
                  else if (material.toLowerCase().includes('plastic')) { Icon = Droplets; iconBg = 'bg-emerald-50'; iconColor = 'text-emerald-500'; }
                  else if (material.toLowerCase().includes('electronic') || material.toLowerCase().includes('e-waste')) { Icon = Cpu; iconBg = 'bg-orange-50'; iconColor = 'text-orange-500'; }
                  else if (material.toLowerCase().includes('cardboard')) { Icon = Package; iconBg = 'bg-amber-50'; iconColor = 'text-amber-500'; }

                  const displayStatus = isExpired ? 'Expired' : order.status;

                  // Needs Attention: 20+ mins old and still Requested
                  const ageMs = Date.now() - new Date(order.createdAt).getTime();
                  const needsAttention = order.status === 'Requested' && !isExpired && ageMs >= 20 * 60 * 1000;

                  return (
                    <div 
                      key={order._id} 
                      onClick={() => window.location.href = `/admin/orders/${order._id}`}
                      className={`bg-white rounded-3xl p-3.5 border shadow-sm hover:shadow-xl hover:shadow-brand-500/5 transition-all group relative overflow-hidden flex flex-col cursor-pointer ${
                        needsAttention 
                          ? 'border-red-400 animate-pulse ring-2 ring-red-300/50' 
                          : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 ${iconBg} rounded-xl flex items-center justify-center ${iconColor} shadow-sm border border-white group-hover:scale-110 transition-transform duration-300`}>
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-black text-gray-900 text-[11px] uppercase truncate max-w-[100px] leading-tight mb-0.5">
                              {order.scrapTypes.join(', ')}
                            </h3>
                            <p className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[180px] sm:max-w-none flex items-center gap-1">
                              {order.customerDetails?.name || 'User'} 
                              <span className="text-blue-600 lowercase font-bold tracking-tighter px-1 py-0.5 bg-blue-50 rounded-md shrink-0">
                                placed at {new Date(order.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </span>
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={displayStatus} />
                      </div>

                      <div className="mb-3 flex-1 px-2.5 py-2 bg-gray-50/30 rounded-2xl border border-gray-100/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Schedule</span>
                          {order.status === 'Requested' && !isExpired && (
                            <ExpiryTimer createdAt={order.createdAt} />
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-black text-gray-800 tracking-tight whitespace-nowrap">
                            {order.timeSlot ? getTimeSlotLabel(order.timeSlot) : 'Urgent'}
                          </p>
                          <p className="text-[8px] font-medium text-gray-400 truncate italic grow text-right" title={order.exactAddress}>
                            {order.exactAddress}
                          </p>
                        </div>
                      </div>

                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {order.status === 'Requested' ? (
                        <div className="flex gap-1.5 w-full">
                          <button 
                            onClick={() => handleBroadcast(order._id)}
                            className="flex-1 py-2.5 bg-brand-600 text-white text-[8px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1"
                          >
                            <Zap size={10} className="fill-white" /> Broadcast
                          </button>
                          <button 
                            onClick={() => openAssignModal(order._id)}
                            className="flex-1 py-2.5 bg-white text-brand-600 border border-brand-100 text-[8px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-brand-50 active:scale-95 transition-all text-center flex items-center justify-center gap-1"
                          >
                            <User size={10} /> Assign
                          </button>
                          <button 
                            onClick={() => window.location.href = `/admin/orders/${order._id}`}
                            className="flex-1 py-2.5 bg-white text-gray-500 border border-gray-100 text-[8px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-center"
                          >
                            Wait
                          </button>
                        </div>
                      ) : order.status === 'Problem' ? (
                          <button 
                             onClick={() => window.location.href = `/admin/orders/${order._id}`}
                             className="flex-1 py-2.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                          >
                            Fix
                          </button>
                        ) : (
                          <div className="flex gap-2 w-full">
                            <button 
                              onClick={() => fetchEngagement(order._id)}
                              className="flex-1 py-2.5 bg-white text-brand-600 border border-brand-500/20 text-[9px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-brand-50 active:scale-95 transition-all flex items-center justify-center"
                            >
                              Track
                            </button>
                            <button 
                              onClick={() => window.location.href = `/admin/orders/${order._id}`}
                              className="flex-1 py-2.5 bg-white text-gray-900 border border-gray-100 text-[9px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-center"
                            >
                              Details
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 pb-4 flex justify-center">
                <div className="flex items-center justify-center gap-3">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => paginate(currentPage - 1)}
                    className="w-10 h-10 flex-shrink-0 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-600 hover:border-brand-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm group"
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
                            ? 'bg-brand-600 text-white border-brand-600 shadow-brand-500/20'
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
                    className="w-10 h-10 flex-shrink-0 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-600 hover:border-brand-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm group"
                  >
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={engagementModal.isOpen}
        onClose={() => setEngagementModal({ isOpen: false, orderId: null, data: null })}
        title="Champion Engagement Tracker"
      >
        <div className="space-y-6">
          {loadingEngagement ? (
            <div className="flex justify-center py-10"><Loader size="md" /></div>
          ) : !engagementModal.data ? (
            <div className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-xs">Failed to load engagement data</div>
          ) : (
            <div className="animate-fade-in">
              <div className="flex gap-4 mb-8">
                <div className="flex-1 bg-blue-50/50 p-4 rounded-3xl border border-blue-100/50 text-center">
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Total Notified</p>
                   <p className="text-3xl font-black text-blue-700">{engagementModal.data.notified.length}</p>
                </div>
                <div className="flex-1 bg-red-50/50 p-4 rounded-3xl border border-red-100/50 text-center">
                   <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Total Declined</p>
                   <p className="text-3xl font-black text-red-700">{engagementModal.data.declined.length}</p>
                </div>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Regional Champions Log</h4>
                {engagementModal.data.notified.length === 0 ? (
                  <p className="text-center py-10 text-gray-400 font-medium italic">No champions identified in this regional pincode.</p>
                ) : (
                  engagementModal.data.notified.map((champ: any) => (
                    <div key={champ.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm relative overflow-hidden">
                          {champ.profilePhoto ? (
                            <img src={champ.profilePhoto} alt={champ.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={18} />
                          )}
                          {champ.hasDeclined && (
                            <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                              <Ban size={20} className="text-red-500/40" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 tracking-tight">{champ.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-widest">
                            <Phone size={10} className="text-brand-500" /> {champ.mobileNumber}
                          </p>
                        </div>
                      </div>
                      <div>
                        {champ.hasDeclined ? (
                          <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-200">Declined</span>
                        ) : (
                          <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-200">Notified</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={assignModal.isOpen}
        onClose={() => setAssignModal(prev => ({ ...prev, isOpen: false }))}
        title="Manual Partner Assignment"
        size="md"
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-500 font-medium">
            Manually assigning a partner will override any ongoing broadcasts. The newly selected partner will receive an immediate SMS notification.
          </p>
          
          {assignModal.loading ? (
            <div className="flex justify-center py-10"><Loader size="md" /></div>
          ) : assignModal.champs.length === 0 ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold text-center border border-red-100">
              No active champions available to assign.
            </div>
          ) : (
            <div className="space-y-4">
                <CustomSelect 
                  label="Select Champion"
                  placeholder="-- Choose a partner --"
                  searchable={true}
                  searchPlaceholder="Search by name, phone or pincode..."
                  options={assignModal.champs.map((c: any) => ({
                    label: c.name,
                    value: c._id,
                    sublabel: `${c.mobileNumber} • ${c.serviceArea}`
                  }))}
                  value={assignModal.selectedChampId}
                  onChange={(val: string) => setAssignModal(prev => ({ ...prev, selectedChampId: val }))}
                />
               
               <Button 
                 fullWidth 
                 className="py-4 text-sm mt-4 rounded-2xl" 
                 isLoading={assignModal.submitting}
                 disabled={!assignModal.selectedChampId}
                 onClick={handleManualAssign}
               >
                 Assign Order Now
               </Button>
            </div>
          )}
        </div>
      </Modal>

    </ProtectedRoute>
  );
}
