'use client';

import React from 'react';
import BottomNav from '../components/common/BottomNav';
import { Header } from '../components/common';

export default function ScrapChampLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pb-24">
        <div className="min-h-screen">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
