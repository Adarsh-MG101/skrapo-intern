'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ProtectedRoute, Loader } from '../components/common';
import Link from 'next/link';
import { API_URL } from '../config/env';
import { 
  CalendarRange, 
  ClipboardList, 
  Package, 
  Clock, 
  ShieldCheck, 
  Sprout, 
  Globe, 
  Sparkles,
  ArrowRight,
  Ban
} from 'lucide-react';
import { Button } from '../components/common';

interface Stats {
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
}

function CustomerDashboardContent() {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/customer/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setStats(data);
      } catch (err) {
        console.error('Stats error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchStats();
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    
    const handleRefresh = () => {
      const fetchStats = async () => {
        try {
          const res = await fetch(`${API_URL}/orders/customer/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) setStats(data);
        } catch (err) {
          console.error('Stats refresh error:', err);
        }
      };
      fetchStats();
    };

    socket.on('order_completed_customer', handleRefresh);
    socket.on('order_accepted_customer', handleRefresh);

    return () => {
      socket.off('order_completed_customer', handleRefresh);
      socket.off('order_accepted_customer', handleRefresh);
    };
  }, [socket, token]);

  return (
    <div className="p-4 md:p-8 lg:p-10 bg-gray-50/20 min-h-screen">
      {/* Welcome */}
      <div className="mb-10 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Welcome back,</span>
          <span className="text-brand-600 font-black inline-flex items-center gap-2">
            {user?.name?.split(' ')[0]}! <Sparkles className="text-brand-500 fill-brand-400" />
          </span>
        </h1>
        <p className="text-gray-500 mt-2 text-base sm:text-lg font-medium">Ready to make a difference with recycling today?</p>
      </div>

      {/* Stats Summary */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader size="lg" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-10 sm:mb-16 animate-fade-in">
          {[
            { label: 'Total Scraps', value: stats.total, Icon: Package, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100' },
            { label: 'Pending', value: stats.pending, Icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'Completed', value: stats.completed, Icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Cancelled', value: stats.cancelled, Icon: Ban, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
          ].map((stat, index) => (
            <div key={stat.label} className="bg-white rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group overflow-hidden" style={{ animationDelay: `${index * 100}ms` }}>
              <div className={`w-10 h-10 sm:w-14 sm:h-14 ${stat.bg} ${stat.color} rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-neutral-100 shadow-inner border ${stat.border} group-hover:scale-110 transition-transform`}>
                <stat.Icon size={20} className="sm:w-7 sm:h-7" strokeWidth={2.5} />
              </div>
              <div className="text-xl sm:text-3xl font-black text-gray-900 mb-0.5">{stat.value}</div>
              <div className="text-[10px] uppercase font-black tracking-widest text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-12 mb-10">
        <Link href="/customer/schedule" className="group block h-full">
          <div className="bg-brand-600 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-14 text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden h-full flex flex-col justify-between border border-brand-500 min-h-[220px] sm:min-h-[280px]">
            <div className="absolute -right-8 -top-8 opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-700 pointer-events-none">
              <CalendarRange size={140} className="sm:w-[220px] sm:h-[220px]" strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl sm:text-4xl font-black mb-2 sm:mb-6 tracking-tight">Schedule Pickup</h3>
              <p className="text-brand-50 font-medium text-xs sm:text-lg mb-6 sm:mb-10 max-w-full leading-snug sm:leading-relaxed">Book a new scrap collection right at your doorstep.</p>
            </div>
            <Button variant="ghost" className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-brand-600 px-6 sm:px-10 py-4 sm:py-6 rounded-xl sm:rounded-2xl text-xs sm:text-lg flex gap-2 w-fit relative z-10 transition-colors">
              Book Now <ArrowRight size={16} />
            </Button>
          </div>
        </Link>

        <Link href="/customer/pickups" className="group block h-full">
          <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-14 border border-gray-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 relative overflow-hidden h-full flex flex-col justify-between min-h-[220px] sm:min-h-[280px]">
             <div className="absolute -right-8 -top-8 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 text-gray-900 pointer-events-none">
              <ClipboardList size={140} className="sm:w-[220px] sm:h-[220px]" strokeWidth={1} />
             </div>
             <div className="relative z-10">
                <h3 className="text-2xl sm:text-4xl font-black text-gray-900 mb-2 sm:mb-6 tracking-tight">My Recycles</h3>
                <p className="text-gray-500 font-medium text-xs sm:text-lg mb-6 sm:mb-10 max-w-full leading-snug sm:leading-relaxed">Track and manage your ongoing recycling orders securely.</p>
             </div>
             <Button variant="primary" className="px-6 sm:px-10 py-4 sm:py-6 rounded-xl sm:rounded-2xl text-xs sm:text-lg flex gap-2 shadow-lg shadow-brand-500/10 w-fit relative z-10">
               Track Activity <ArrowRight size={16} />
             </Button>
          </div>
        </Link>
      </div>



      {/* Empty state or impact banner */}
      {!loading && stats.total === 0 ? (
        <div className="bg-white rounded-[3rem] p-16 border-4 border-dashed border-gray-100 shadow-sm text-center animate-fade-in flex flex-col items-center">
            <div className="w-24 h-24 bg-brand-50 rounded-[2rem] flex items-center justify-center mb-8 border border-brand-100 animate-float text-brand-600">
                <Sprout size={48} strokeWidth={2.5} />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter">Ready to Start Recycling?</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-10 text-lg font-medium leading-relaxed">
                Connect with local champions and turn your household scrap into value.
            </p>
            <Link href="/customer/schedule">
                <button className="px-12 py-5 bg-brand-600 text-white font-black rounded-2xl hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/30 active:scale-95 text-lg hover:px-14 flex items-center gap-3">
                    Book Your First Pickup <ArrowRight />
                </button>
            </Link>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-brand-600 to-emerald-700 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-xl shadow-brand-500/10">
           <div className="relative z-10 md:flex items-center justify-between gap-10">
              <div className="max-w-md">
                 <h2 className="text-3xl font-black mb-4 tracking-tight flex items-center gap-3">
                    Eco Impact <Globe className="text-brand-100 animate-pulse" />
                 </h2>
                 <p className="text-emerald-100 font-medium text-lg leading-relaxed">
                   You have successfully recycled scrap from {stats.completed} sessions. 
                   Together we are reducing landfill waste one pickup at a time.
                 </p>
              </div>
              <div className="mt-8 md:mt-0">
                 <div className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 text-white font-black uppercase tracking-widest text-sm gap-2">
                    <ShieldCheck size={18} /> Verified Green User
                 </div>
              </div>
           </div>
           <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>
      )}
    </div>
  );
}

export default function CustomerPage() {
  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <CustomerDashboardContent />
    </ProtectedRoute>
  );
}
