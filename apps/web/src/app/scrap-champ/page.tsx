'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute, Loader, Button } from '../components/common';
import Link from 'next/link';
import { API_URL } from '../config/env';
import { 
  Inbox, 
  CheckCircle2, 
  TrendingUp, 
  Star, 
  Truck, 
  History as HistoryIcon, 
  Zap, 
  Package, 
  ArrowRight,
  Hand
} from 'lucide-react';

interface Stats {
  total: number;
  accepted: number;
  declined: number;
  avgRating: string;
}

function ScrapChampDashboardContent() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<Stats>({ total: 0, accepted: 0, declined: 0, avgRating: '--' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/scrap-champ/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          const total = data.length;
          const accepted = data.filter((j: any) => j.status === 'Accepted' || j.status === 'Completed').length;
          const ratings = data.filter((j: any) => j.feedback?.rating).map((j: any) => j.feedback.rating);
          const avg = ratings.length > 0 ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1) : '--';
          
          setStats({
            total,
            accepted,
            declined: 0, 
            avgRating: avg
          });
        }
      } catch (err) {
        console.error('Stats error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchStats();
  }, [token]);

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-50/30 overflow-hidden">
      <main className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-12 border-x-0 overflow-hidden">
        <div className="mb-8 sm:mb-10 animate-fade-in flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-2 truncate">
              Hi, <span className="text-brand-600">{user?.name.split(' ')[0]}</span>! <Hand className="text-brand-500 flex-shrink-0" size={24} />
            </h1>
            <p className="text-gray-500 font-medium text-sm sm:text-lg mt-1 sm:mt-3">Ready to collect and earn today?</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-xl border border-brand-100 font-black text-[10px] uppercase tracking-widest animate-pulse h-fit">
             <Zap size={14} fill="currentColor" /> System Online
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8 mb-10 sm:mb-16">
          {[
            { label: 'Assigned', value: stats.total, Icon: Inbox, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { label: 'Completed', value: stats.accepted, Icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Earning', value: stats.total > 0 ? `${Math.round((stats.accepted/stats.total)*100)}%` : '--', Icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
            { label: 'Rating', value: stats.avgRating, Icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          ].map((stat, index) => (
            <div key={stat.label} className="bg-white rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group animate-fade-in overflow-hidden" style={{ animationDelay: `${index * 100}ms` }}>
              <div className={`w-10 h-10 sm:w-14 sm:h-14 ${stat.bg} ${stat.color} rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-neutral-100 shadow-inner border ${stat.border} group-hover:scale-110 transition-transform`}>
                <stat.Icon size={20} className="sm:w-7 sm:h-7" strokeWidth={2.5} />
              </div>
              <div className="text-xl sm:text-3xl font-black text-gray-900 mb-0.5">{stat.value}</div>
              <div className="text-[10px] uppercase font-black tracking-widest text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-12 mb-10">
           <Link href="/scrap-champ/jobs" className="group block h-full">
            <div className="bg-brand-600 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-14 text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden h-full flex flex-col justify-between border border-brand-500 min-h-[220px] sm:min-h-[280px]">
              <div className="absolute -right-8 -top-8 opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-700 pointer-events-none">
                <Truck size={140} className="sm:w-[220px] sm:h-[220px]" strokeWidth={1} />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl sm:text-4xl font-black mb-2 sm:mb-6 tracking-tight">Active Jobs</h3>
                <p className="text-brand-50 font-medium text-xs sm:text-lg mb-6 sm:mb-10 max-w-full leading-snug sm:leading-relaxed">Manage your current pickup route and assignments.</p>
              </div>
              <Button variant="ghost" className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-brand-600 px-6 sm:px-10 py-4 sm:py-6 rounded-xl sm:rounded-2xl text-xs sm:text-lg flex gap-2 w-fit relative z-10">
                Start Route <ArrowRight size={16} />
              </Button>
            </div>
           </Link>

           <Link href="/scrap-champ/history" className="group block text-left h-full">
            <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-14 border border-gray-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 relative overflow-hidden h-full flex flex-col justify-between min-h-[220px] sm:min-h-[280px]">
               <div className="absolute -right-8 -top-8 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 text-gray-900 pointer-events-none">
                <HistoryIcon size={140} className="sm:w-[220px] sm:h-[220px]" strokeWidth={1} />
               </div>
               <div className="relative z-10">
                  <h3 className="text-2xl sm:text-4xl font-black text-gray-900 mb-2 sm:mb-6 tracking-tight">Collection Log</h3>
                  <p className="text-gray-500 font-medium text-xs sm:text-lg mb-6 sm:mb-10 max-w-full leading-snug sm:leading-relaxed">Review your completed pickups and verify earnings.</p>
               </div>
               <Button variant="primary" className="px-6 sm:px-10 py-4 sm:py-6 rounded-xl sm:rounded-2xl text-xs sm:text-lg flex gap-2 shadow-lg shadow-brand-500/10 w-fit relative z-10">
                 View History <ArrowRight size={16} />
               </Button>
            </div>
           </Link>
        </div>

        <div className="mt-8 sm:mt-16 bg-white rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10 border border-gray-100 shadow-sm relative overflow-hidden group">
           <div className="absolute bottom-0 right-0 opacity-5 pointer-events-none transition-transform group-hover:scale-110 duration-700">
              <Package size={120} />
           </div>
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="min-w-0 flex-1">
                <p className="text-brand-600 font-black text-[9px] uppercase tracking-[0.2em] mb-2 sm:mb-3">Sustainability Impact</p>
                <h2 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight mb-1 sm:mb-2 leading-tight">Environmental Impact</h2>
                <p className="text-gray-500 font-medium text-xs sm:text-lg">Diverted over <span className="text-brand-600 font-black">2.4 Tons</span> of waste from landfills.</p>
              </div>
              <div className="flex -space-x-3 flex-shrink-0">
                 {[1,2,3].map(i => (
                   <div key={i} className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gray-100 border-2 sm:border-4 border-white shadow-sm flex items-center justify-center text-gray-400 font-black text-[8px]">
                      #{i}
                   </div>
                 ))}
                 <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-brand-500 border-2 sm:border-4 border-white shadow-md flex items-center justify-center text-white font-black text-[8px]">
                    +12
                 </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}

export default function ScrapChampPage() {
  return (
    <ProtectedRoute allowedRoles={['scrapChamp']}>
      <ScrapChampDashboardContent />
    </ProtectedRoute>
  );
}
