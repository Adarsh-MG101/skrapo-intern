'use client';

import React from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import { SchedulePickupFlow } from '../../components/customer/SchedulePickupFlow';

export default function SchedulePickupPage() {
  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <div className="p-4 md:p-8 lg:p-10 bg-gray-50/30 min-h-screen">
        <SchedulePickupFlow />
      </div>
    </ProtectedRoute>
  );
}
