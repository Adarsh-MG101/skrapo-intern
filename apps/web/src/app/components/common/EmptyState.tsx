'use client';

import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon = '📦', title, description, actionText, onAction, action }) => {
  return (
    <div className="bg-white rounded-[2.5rem] p-16 border-2 border-dashed border-gray-100 text-center flex flex-col items-center">
      <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center text-4xl mb-8 border border-brand-100 animate-float">
        {icon}
      </div>
      <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">{title}</h3>
      {description && (
        <p className="text-gray-400 max-w-sm mx-auto mb-8 text-lg font-medium leading-relaxed">
          {description}
        </p>
      )}
      {actionText && (
        <Button onClick={onAction} size="lg">
          {actionText}
        </Button>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
