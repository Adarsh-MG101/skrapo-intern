'use client';

import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({ size = 'md', fullPage }) => {
  const sizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-[6px]',
  };

  const content = (
    <div className="flex flex-col items-center justify-center">
      <div className={`${sizes[size]} border-brand-100 border-t-brand-500 rounded-full animate-spin`} />
      <p className="mt-4 text-sm font-bold text-gray-400 uppercase tracking-[0.2em] animate-pulse">Loading</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[100] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};
