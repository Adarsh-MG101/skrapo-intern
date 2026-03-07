'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { Loader } from '../components/common';
import Link from 'next/link';
import { API_URL } from '../config/env';

interface Stats {
  total: number;
  pending: number;
  completed: number;
  avgRating: string;
}

function CustomerDashboardContent() {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, completed: 0, avgRating: '--' });
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
      console.log('🔄 [Customer Dashboard] Refreshing stats via socket');
      // Re-fetch stats
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
      <div className="mb-10 animate-fade-in flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Welcome back, <span className="text-brand-600 font-black">{user?.name?.split(' ')[0]}</span>! 👋
          </h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">Ready to make a difference with recycling today?</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 pr-6">
          <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-500/20">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="text-left leading-tight">
            <p className="text-sm font-black text-gray-900">{user?.name}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <Link href="/customer/schedule" className="group">
          <div className="h-full bg-brand-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 transition-all hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform" />
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform backdrop-blur-md border border-white/20">
              📅
            </div>
            <h3 className="text-2xl font-black mb-2">Schedule Pickup</h3>
            <p className="text-brand-100 font-medium leading-relaxed">Book a new scrap collection at your doorstep</p>
          </div>
        </Link>

        <Link href="/customer/pickups" className="group">
          <div className="h-full bg-white rounded-[2.5rem] p-8 border-2 border-gray-50 hover:border-brand-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform border border-brand-100">
              📋
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">My Recycles</h3>
            <p className="text-gray-400 font-medium leading-relaxed">Track and manage your ongoing recycling orders</p>
          </div>
        </Link>

        <Link href="/customer/profile" className="group">
          <div className="h-full bg-white rounded-[2.5rem] p-8 border-2 border-gray-50 hover:border-brand-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform border border-emerald-100">
              ⚡
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Impact Profile</h3>
            <p className="text-gray-400 font-medium leading-relaxed">See your environmental impact and basic profile</p>
          </div>
        </Link>
      </div>

      {/* Stats Summary */}
      <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3 tracking-tight">
        <span className="w-2 h-8 bg-brand-500 rounded-full" />
        Activity Summary
      </h2>
      
      {loading ? (
        <div className="flex justify-center py-10"><Loader size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12 animate-fade-in">
          {[
            { label: 'Total Scraps', value: stats.total, icon: '📦', color: 'text-brand-600', bg: 'bg-brand-50' },
            { label: 'Pending', value: stats.pending, icon: '⏳', color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Completed', value: stats.completed, icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Reputation', value: stats.avgRating, icon: '⭐', color: 'text-yellow-600', bg: 'bg-yellow-50' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50 hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center text-xl mb-4 font-bold`}>
                {stat.icon}
              </div>
              <div className="text-3xl font-black text-gray-900">{stat.value}</div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state or impact banner */}
      {!loading && stats.total === 0 ? (
        <div className="bg-white rounded-[3rem] p-16 border-4 border-dashed border-gray-50 shadow-sm text-center animate-fade-in flex flex-col items-center">
            <div className="w-24 h-24 bg-brand-50 rounded-[2rem] flex items-center justify-center text-5xl mb-8 border border-brand-100 animate-float">
                🌱
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter">Ready to Start Recycling?</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-10 text-lg font-medium leading-relaxed">
                Connect with local champions and turn your household scrap into value.
            </p>
            <Link href="/customer/schedule">
                <button className="px-12 py-5 bg-brand-600 text-white font-black rounded-2xl hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/30 active:scale-95 text-lg hover:px-14">
                    Book Your First Pickup
                </button>
            </Link>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-xl shadow-emerald-500/10">
           <div className="relative z-10 md:flex items-center justify-between gap-10">
              <div className="max-w-md">
                 <h2 className="text-3xl font-black mb-4 tracking-tight">Eco Impact 🌍</h2>
                 <p className="text-emerald-100 font-medium text-lg leading-relaxed">
                   You have successfully recycled scrap from {stats.completed} sessions. 
                   Together we are reducing landfill waste one pickup at a time.
                 </p>
              </div>
              <div className="mt-8 md:mt-0">
                 <div className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 text-white font-black uppercase tracking-widest text-sm">
                    Verified Green User
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
