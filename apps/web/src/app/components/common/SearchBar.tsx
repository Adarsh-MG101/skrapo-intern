'use client';

import React from 'react';
import { Input } from './Input';

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, ...props }) => {
  return (
    <Input
      leftIcon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      placeholder="Search..."
      onChange={(e) => {
        onSearch?.(e.target.value);
        props.onChange?.(e);
      }}
      {...props}
    />
  );
};
