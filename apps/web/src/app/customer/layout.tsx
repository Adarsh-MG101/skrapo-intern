'use client';

import React from 'react';
import BottomNav from '../components/common/BottomNav';
import Sidebar from '../components/common/Sidebar';
import { Header } from '../components/common';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar onCollapse={setIsCollapsed} />
      <div className={`flex-1 transition-all duration-500 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-[280px]'}`}>
        <Header />
        <main className="pb-24 lg:pb-8">
          <div className="min-h-screen">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
