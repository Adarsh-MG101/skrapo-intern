'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { Loader, StatusBadge } from '../components/common';
import Link from 'next/link';
import { API_URL } from '../config/env';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Clock, 
  Truck, 
  Trophy,
  Zap, 
  MessageSquare, 
  Search, 
  Package,
  ArrowRight
} from 'lucide-react';
import { Button } from '../components/common';

interface AdminStats {
  total: number;
  pending: number;
  active: number;
  completed: number;
  champs: number;
  recentActivity: any[];
}

function AdminDashboardContent() {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/admin/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setStats(data);
      } catch (err) {
        console.error('Admin stats error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchStats();
  }, [token]);

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-50/30 p-4 md:p-8 lg:p-10">
      <main className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-12 animate-fade-in">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Control Center <LayoutDashboard className="inline-block text-brand-500 ml-2" size={36} strokeWidth={3} />
          </h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">Monitoring Recyclemybin operations and scrap ecosystem.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-10 sm:mb-16 animate-fade-in">
          {[
            { label: 'Total Orders', value: stats?.total, Icon: ClipboardList, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100' },
            { label: 'Unallocated', value: stats?.pending, Icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'Active Jobs', value: stats?.active, Icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { label: 'Champ Network', value: stats?.champs, Icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 xl:gap-12 mb-12 animate-fade-in delay-200">
          <Link href="/admin/orders" className="group block h-full">
            <div className="bg-brand-600 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-14 text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden h-full flex flex-col justify-between border border-brand-500 min-h-[220px] sm:min-h-[280px]">
              <div className="absolute -right-8 -top-8 opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-700 pointer-events-none">
                <Zap size={140} className="sm:w-[220px] sm:h-[220px]" strokeWidth={1} />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl sm:text-4xl font-black mb-2 sm:mb-6 tracking-tight">Allocation</h3>
                <p className="text-brand-50 font-medium text-xs sm:text-lg mb-6 sm:mb-10 max-w-full leading-snug sm:leading-relaxed">Match pending pickups with available Scrap Champions.</p>
              </div>
              <Button variant="ghost" className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-brand-600 px-6 sm:px-10 py-4 sm:py-6 rounded-xl sm:rounded-2xl text-xs sm:text-lg flex gap-2 w-fit relative z-10 transition-colors">
                Queue <ArrowRight size={16} />
              </Button>
            </div>
          </Link>

          <Link href="/admin/feedback" className="group block h-full">
            <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-14 border border-gray-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 relative overflow-hidden h-full flex flex-col justify-between min-h-[220px] sm:min-h-[280px]">
               <div className="absolute -right-8 -top-8 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 text-gray-900 pointer-events-none">
                <MessageSquare size={140} className="sm:w-[220px] sm:h-[220px]" strokeWidth={1} />
               </div>
               <div className="relative z-10">
                  <h3 className="text-2xl sm:text-4xl font-black text-gray-900 mb-2 sm:mb-6 tracking-tight">Feedback</h3>
                  <p className="text-gray-500 font-medium text-xs sm:text-lg mb-6 sm:mb-10 max-w-full leading-snug sm:leading-relaxed">Review customer ratings and agent performance.</p>
               </div>
               <Button variant="primary" className="px-6 sm:px-10 py-4 sm:py-6 rounded-xl sm:rounded-2xl text-xs sm:text-lg flex gap-2 shadow-lg shadow-brand-500/10 w-fit relative z-10">
                 Reports <ArrowRight size={16} />
               </Button>
            </div>
          </Link>

          <Link href="/admin/history" className="group block h-full">
            <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-14 border border-gray-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 relative overflow-hidden h-full flex flex-col justify-between min-h-[220px] sm:min-h-[280px]">
               <div className="absolute -right-8 -top-8 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 text-gray-900 pointer-events-none">
                <Clock size={140} className="sm:w-[220px] sm:h-[220px]" strokeWidth={1} />
               </div>
               <div className="relative z-10">
                  <h3 className="text-2xl sm:text-4xl font-black text-gray-900 mb-2 sm:mb-6 tracking-tight">History</h3>
                  <p className="text-gray-500 font-medium text-xs sm:text-lg mb-6 sm:mb-10 max-w-full leading-snug sm:leading-relaxed">Full records of all past pickups and transactions.</p>
               </div>
               <Button variant="primary" className="bg-gray-900 border-gray-900 hover:bg-gray-800 px-6 sm:px-10 py-4 sm:py-6 rounded-xl sm:rounded-2xl text-xs sm:text-lg flex gap-2 shadow-lg shadow-gray-900/10 w-fit relative z-10">
                 View Logs <ArrowRight size={16} />
               </Button>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-10 border border-gray-100 shadow-sm animate-fade-in delay-300 w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-10 gap-4">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <span className="w-2 h-8 bg-brand-500 rounded-full flex-shrink-0" />
              Latest Orders
            </h2>
            <Link href="/admin/orders" className="text-[10px] sm:text-xs font-black uppercase text-brand-600 hover:underline tracking-widest">
              See All Activities
            </Link>
          </div>

          {!stats?.recentActivity || stats.recentActivity.length === 0 ? (
            <div className="text-center py-12 sm:py-20 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100">
               <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4 border border-gray-100 shadow-sm">
                  <Search size={24} className="sm:w-8 sm:h-8" />
               </div>
               <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-2">Awaiting the First Move</h3>
               <p className="text-xs sm:text-sm text-gray-400 font-medium max-w-xs sm:max-w-sm mx-auto px-4">Once customers start recycling, their footprint will appear here globally.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              {stats.recentActivity.map((order: any, idx) => (
                <div key={order._id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 sm:p-6 bg-gray-50/50 rounded-2xl sm:rounded-3xl border border-gray-100 hover:bg-white transition-all group hover:shadow-md animate-fade-in w-full overflow-hidden" style={{ animationDelay: `${idx * 50}ms` }}>
                   <div className="flex items-center gap-4 sm:gap-6 mb-4 md:mb-0 w-full min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 group-hover:border-brand-100 group-hover:bg-brand-50 transition-colors flex-shrink-0">
                        <Package size={20} className="sm:w-[22px] sm:h-[22px]" />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                         <h4 className="font-black text-gray-900 tracking-tight uppercase text-[11px] sm:text-sm truncate mb-0.5 sm:mb-1 w-full">{order.scrapTypes.slice(0, 2).join(', ')}{order.scrapTypes.length > 2 && '...'}</h4>
                         <p className="text-[10px] sm:text-xs font-bold text-gray-400 flex items-center gap-1.5 sm:gap-2 truncate">
                             <span className="text-gray-900 truncate max-w-[80px] sm:max-w-[120px]">{order.customer?.name}</span>
                             <span>•</span>
                             <span className="flex-shrink-0">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                         </p>
                      </div>
                   </div>
                   <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 w-full md:w-auto flex-shrink-0 mt-2 sm:mt-0">
                      <div className="transform scale-[0.85] sm:scale-100 origin-left">
                        <StatusBadge status={order.status} />
                      </div>
                      <Link href={`/admin/orders/${order._id}`} className="flex-1 sm:flex-none ml-auto text-right">
                         <div className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white rounded-xl border border-gray-200 text-[10px] sm:text-xs font-black text-gray-600 uppercase tracking-widest hover:border-brand-600 hover:text-brand-600 transition-all text-center whitespace-nowrap">
                            Inspect
                         </div>
                      </Link>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
