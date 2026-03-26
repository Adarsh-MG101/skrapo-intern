'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Option {
  label: string;
  value: string;
  sublabel?: string; // Additional info like phone or pincode
}

interface CustomSelectProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  error,
  required,
  searchable = false,
  searchPlaceholder = 'Search...',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(searchLower) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(searchLower))
    );
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search when opening/closing
  useEffect(() => {
    if (!isOpen) setSearchQuery('');
  }, [isOpen]);

  const sizeClasses = {
    sm: {
      toggle: 'px-4 py-2 text-[11px]',
      option: 'px-4 py-2 text-xs',
      label: 'text-xs mb-1',
      search: 'py-1.5 px-3 text-xs',
      icon: 14,
    },
    md: {
      toggle: 'px-5 py-3.5 text-sm',
      option: 'px-5 py-3 text-sm',
      label: 'text-sm mb-1.5',
      search: 'py-2 px-4 text-sm',
      icon: 20,
    },
    lg: {
      toggle: 'px-6 py-4 text-base',
      option: 'px-6 py-4 text-base',
      label: 'text-base mb-2',
      search: 'py-2.5 px-5 text-base',
      icon: 24,
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className={`block font-bold text-gray-700 ml-1 ${currentSize.label}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full bg-white border-2 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-200
            ${currentSize.toggle}
            ${isOpen ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-gray-100 hover:border-brand-200'}
            ${error ? 'border-red-500 focus:ring-red-500/10' : ''}
            shadow-sm
          `}
        >
          <span className={`font-bold truncate uppercase tracking-widest ${selectedOption ? 'text-gray-900' : 'text-gray-400 font-medium'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={currentSize.icon}
            className={`text-gray-400 transition-transform duration-300 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180 text-brand-500' : ''}`}
          />
        </div>

        {isOpen && (
          <div className="absolute z-[100] w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden animate-fade-in py-2">
            {searchable && (
              <div className="px-3 pb-2 pt-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={currentSize.icon - 4} />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className={`w-full bg-gray-50 border-none rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all ${currentSize.search} ${size === 'sm' ? 'pl-8' : 'pl-10'}`}
                  />
                </div>
              </div>
            )}
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`
                      transition-colors cursor-pointer flex flex-col gap-0.5
                      ${currentSize.option}
                      ${option.value === value ? 'bg-brand-50 text-brand-600' : 'text-gray-700 hover:bg-gray-50'}
                    `}
                  >
                    <span className="font-bold uppercase tracking-widest">{option.label}</span>
                    {option.sublabel && (
                      <span className={`text-[9px] uppercase tracking-[0.15em] font-black ${option.value === value ? 'text-brand-400' : 'text-gray-400'}`}>
                        {option.sublabel}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-5 py-6 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  No results found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className={`mt-1.5 ml-1 font-semibold text-red-500 ${size === 'sm' ? 'text-[10px]' : 'text-sm'}`}>
          {error}
        </p>
      )}
    </div>
  );
};
