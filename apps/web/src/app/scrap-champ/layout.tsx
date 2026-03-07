'use client';

import React, { useState } from 'react';
import Sidebar from '../components/common/Sidebar';

export default function ScrapChampLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar onCollapse={setIsSidebarCollapsed} />
      
      <main 
        className={`flex-1 transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-[280px]'}
        `}
      >
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
