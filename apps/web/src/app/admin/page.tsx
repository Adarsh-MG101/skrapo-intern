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
  Settings2, 
  Search, 
  Package
} from 'lucide-react';

interface AdminStats {
  total: number;
  pending: number;
  active: number;
  completed: number;
  champs: number;
  recentActivity: any[];
}

function AdminDashboardContent() {
  const { user, token } = useAuth();
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
        <div className="mb-12 animate-fade-in flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              Control Center <LayoutDashboard className="inline-block text-brand-500 ml-2" size={36} strokeWidth={3} />
            </h1>
            <p className="text-gray-500 mt-2 text-lg font-medium">Monitoring Recycle My Bin operations and scrap ecosystem.</p>
          </div>
          <div className="md:hidden flex items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 pr-6">
            <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-500/20">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="text-left leading-tight">
              <p className="text-sm font-black text-gray-900">{user?.name}</p>
              <p className="text-[10px] font-black uppercase text-brand-600 tracking-widest mt-1">Global Admin</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
          {[
            { label: 'Total Orders', value: stats?.total, icon: <ClipboardList size={22} />, color: 'text-brand-600', bg: 'bg-brand-50' },
            { label: 'Unallocated', value: stats?.pending, icon: <Clock size={22} />, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Active Jobs', value: stats?.active, icon: <Truck size={22} />, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Champ Network', value: stats?.champs, icon: <Trophy size={22} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((stat, index) => (
            <div key={stat.label} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center text-xl mb-4 font-bold`}>
                {stat.icon}
              </div>
              <div className="text-3xl font-black text-gray-900">{stat.value}</div>
              <div className="text-[10px] uppercase font-black tracking-widest text-gray-400 mt-1.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Link href="/admin/orders" className="group">
             <div className="h-full bg-brand-600 rounded-[2.5rem] p-10 text-white shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 transition-all hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
                   <Zap size={80} strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-black mb-2">Allocation Center</h3>
                <p className="text-brand-100 font-medium mb-8">Match pending pickups with Scrap Champions.</p>
                <div className="inline-flex items-center px-6 py-2 bg-white/10 rounded-xl border border-white/20 text-white font-bold text-xs uppercase tracking-widest group-hover:bg-white group-hover:text-brand-600 transition-colors">
                   Go to Queue
                </div>
             </div>
          </Link>

          <Link href="/admin/feedback" className="group">
             <div className="h-full bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform text-gray-400">
                   <MessageSquare size={80} strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Feedback Reports</h3>
                <p className="text-gray-500 font-medium mb-8">Review customer ratings and agent performance.</p>
                <div className="inline-flex items-center px-6 py-2 bg-brand-50 rounded-xl border border-brand-100 text-brand-600 font-bold text-xs uppercase tracking-widest hover:bg-brand-100 transition-colors">
                   View Reports
                </div>
             </div>
          </Link>

          <Link href="/admin/settings" className="group">
             <div className="h-full bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform text-gray-400">
                   <Settings2 size={80} strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">System Config</h3>
                <p className="text-gray-500 font-medium mb-8">Manage app roles, areas, and SMS templates.</p>
                <div className="inline-flex items-center px-6 py-2 bg-gray-50 rounded-xl border border-gray-100 text-gray-600 font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors">
                   Settings
                </div>
             </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm animate-fade-in delay-300">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <span className="w-2 h-8 bg-brand-500 rounded-full" />
              Latest Orders
            </h2>
            <Link href="/admin/orders" className="text-xs font-black uppercase text-brand-600 hover:underline tracking-widest">
              See All Activities
            </Link>
          </div>

          {!stats?.recentActivity || stats.recentActivity.length === 0 ? (
            <div className="text-center py-20 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4 border border-gray-100 shadow-sm">
                  <Search size={32} />
               </div>
               <h3 className="text-xl font-black text-gray-900 mb-2">Awaiting the First Move</h3>
               <p className="text-gray-400 font-medium max-w-sm mx-auto">Once customers start recycling, their footprint will appear here globally.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {stats.recentActivity.map((order: any, idx) => (
                <div key={order._id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-gray-50/50 rounded-3xl border border-gray-100 hover:bg-white transition-all group hover:shadow-md animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                   <div className="flex items-center gap-6 mb-4 md:mb-0 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 group-hover:border-brand-100 group-hover:bg-brand-50 transition-colors flex-shrink-0">
                        <Package size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                         <h4 className="font-black text-gray-900 tracking-tight uppercase text-sm truncate mb-1">{order.scrapTypes.slice(0, 2).join(', ')}{order.scrapTypes.length > 2 && '...'}</h4>
                         <p className="text-xs font-bold text-gray-400 flex items-center gap-2">
                             <span className="text-gray-900">{order.customer?.name}</span>
                             <span>•</span>
                             <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                         </p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4 w-full md:w-auto flex-shrink-0">
                      <StatusBadge status={order.status} />
                      <Link href={`/admin/orders?search=${order._id}`} className="flex-1 md:flex-none">
                         <div className="px-6 py-2.5 bg-white rounded-xl border border-gray-200 text-xs font-black text-gray-600 uppercase tracking-widest hover:border-brand-600 hover:text-brand-600 transition-all text-center">
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
