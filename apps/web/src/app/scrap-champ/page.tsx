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
    <div className="min-h-screen bg-gray-50/30">
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12 animate-fade-in flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
              Welcome back, <span className="text-brand-600">{user?.name.split(' ')[0]}</span>! <Hand className="text-brand-500" />
            </h1>
            <p className="text-gray-500 font-medium text-lg mt-3">Ready to collect some scrap and earn today?</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-xl border border-brand-100 font-black text-[10px] uppercase tracking-widest animate-pulse shadow-sm">
             <Zap size={14} fill="currentColor" /> System Online & Ready
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-16">
          {[
            { label: 'Assigned Jobs', value: stats.total, Icon: Inbox, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { label: 'Completed', value: stats.accepted, Icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Earning Rate', value: stats.total > 0 ? `${Math.round((stats.accepted/stats.total)*100)}%` : '--', Icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
            { label: 'Partner Rating', value: stats.avgRating, Icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          ].map((stat, index) => (
            <div key={stat.label} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6 shadow-inner border ${stat.border} group-hover:scale-110 transition-transform`}>
                <stat.Icon size={28} strokeWidth={2.5} />
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{stat.value}</div>
              <div className="text-[10px] uppercase font-black tracking-[0.2em] text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-12">
           <Link href="/scrap-champ/jobs" className="group">
            <div className="bg-brand-600 rounded-[3rem] p-10 lg:p-14 text-white shadow-2xl shadow-brand-500/20 hover:shadow-brand-500/40 transition-all hover:-translate-y-2 relative overflow-hidden h-full flex flex-col justify-between border border-brand-500">
              <div className="absolute -right-6 -top-6 p-8 opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-700">
                <Truck size={180} strokeWidth={1} />
              </div>
              <div>
                <h3 className="text-4xl font-black mb-6 tracking-tight">Active Jobs</h3>
                <p className="text-brand-100 font-medium text-lg mb-10 max-w-sm leading-relaxed">Check for new pickup assignments and manage your current route across the city.</p>
              </div>
              <Button variant="ghost" className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-brand-600 px-10 py-6 rounded-2xl text-lg flex gap-3 w-fit">
                Start Route <ArrowRight />
              </Button>
            </div>
           </Link>

           <Link href="/scrap-champ/history" className="group text-left">
            <div className="bg-white rounded-[3rem] p-10 lg:p-14 border border-gray-100 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 relative overflow-hidden h-full flex flex-col justify-between">
               <div className="absolute -right-6 -top-6 p-8 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 text-gray-900">
                <HistoryIcon size={180} strokeWidth={1} />
               </div>
               <div>
                  <h3 className="text-4xl font-black text-gray-900 mb-6 tracking-tight">Collection Log</h3>
                  <p className="text-gray-500 font-medium text-lg mb-10 max-w-sm leading-relaxed">Review your completed pickups, verify earnings, and check customer feedback/ratings.</p>
               </div>
               <Button variant="primary" className="px-10 py-6 rounded-2xl text-lg flex gap-3 shadow-lg shadow-brand-500/10 w-fit">
                 View History <ArrowRight />
               </Button>
            </div>
           </Link>
        </div>

        <div className="mt-16 bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden group">
           <div className="absolute bottom-0 right-0 opacity-5 pointer-events-none transition-transform group-hover:scale-110 duration-700">
              <Package size={140} />
           </div>
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div>
                <p className="text-brand-600 font-black text-[10px] uppercase tracking-[0.2em] mb-3">Community Impact</p>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">You're making a difference!</h2>
                <p className="text-gray-500 font-medium text-lg">Your pickups helped divert over <span className="text-brand-600 font-black">2.4 Tons</span> of waste from landfills this month.</p>
              </div>
              <div className="flex -space-x-4">
                 {[1,2,3,4].map(i => (
                   <div key={i} className="w-12 h-12 rounded-2xl bg-gray-100 border-4 border-white shadow-sm flex items-center justify-center text-gray-400 font-black text-xs">
                      #{i}
                   </div>
                 ))}
                 <div className="w-12 h-12 rounded-2xl bg-brand-500 border-4 border-white shadow-md flex items-center justify-center text-white font-black text-xs">
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
