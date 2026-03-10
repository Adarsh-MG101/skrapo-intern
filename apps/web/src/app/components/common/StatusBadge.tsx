'use client';

import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getTheme = (s: string) => {
    const low = s.toLowerCase();
    
    // Most important/distinctive statuses
    if (low === 'requested') return { bg: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' };
    if (low === 'accepted') return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' };
    if (low === 'assigned') return { bg: 'bg-brand-50 text-brand-700 border-brand-200', dot: 'bg-brand-500' };
    if (low === 'completed' || low === 'success') return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    
    // Secondary statuses
    if (['picking', 'arrived'].includes(low)) return { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
    if (low === 'expired') return { bg: 'bg-amber-100/50 text-amber-900 border-amber-300', dot: 'bg-amber-600' };
    if (['problem', 'declined', 'denied', 'cancelled'].includes(low)) return { bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' };
    if (low === 'new') return { bg: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' };
    
    return { bg: 'bg-gray-50 text-gray-500 border-gray-200', dot: 'bg-gray-300' };
  };

  const theme = getTheme(status);

  return (
    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black border ${theme.bg} uppercase tracking-[0.1em] flex-shrink-0 whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${theme.dot}`} />
      {status}
    </span>
  );
};
