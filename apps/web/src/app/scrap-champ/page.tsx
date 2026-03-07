'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { Loader, Button } from '../components/common';
import Link from 'next/link';
import { API_URL } from '../config/env';

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
            declined: 0, // Placeholder
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
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10 animate-fade-in">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Welcome back, <span className="text-brand-600">{user?.name}</span> 👋
          </h1>
          <p className="text-gray-500 font-medium text-lg mt-2">Here's what's happening in your service area today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {[
            { label: 'Total Jobs', value: stats.total, icon: '📬', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Accepted', value: stats.accepted, icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Completion Rate', value: stats.total > 0 ? `${Math.round((stats.accepted/stats.total)*100)}%` : '--', icon: '📈', color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Avg Rating', value: stats.avgRating, icon: '⭐', color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((stat, index) => (
            <div key={stat.label} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center text-xl mb-4 font-bold`}>
                {stat.icon}
              </div>
              <div className="text-2xl font-black text-gray-900">{stat.value}</div>
              <div className="text-[10px] uppercase font-black tracking-widest text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
           <Link href="/scrap-champ/jobs" className="group">
            <div className="bg-brand-600 rounded-[2.5rem] p-10 text-white shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 transition-all hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform text-6xl">🚚</div>
              <h3 className="text-3xl font-black mb-4">New Assignments</h3>
              <p className="text-brand-100 font-medium mb-8 max-w-xs">You have new pickup requests waiting for your decision.</p>
              <Button variant="ghost" className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-brand-600 px-8">View Assignments</Button>
            </div>
           </Link>

           <Link href="/scrap-champ/history" className="group text-left">
            <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform text-6xl">📜</div>
               <h3 className="text-3xl font-black text-gray-900 mb-4">Job History</h3>
               <p className="text-gray-500 font-medium mb-8 max-w-xs">Review your past collections, earnings, and ratings.</p>
               <Button variant="primary" className="px-8">View History</Button>
            </div>
           </Link>
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
