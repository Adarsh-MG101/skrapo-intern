'use client';

import React, { useState, useMemo } from 'react';
import { Input } from './Input';
import { Modal } from './Modal';
import { TIME_SLOTS, getTimeSlotLabel } from '../../utils/dateTime';

interface DateTimePickerProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  type?: 'date' | 'time';
  min?: string;
  isToday?: boolean;
  allowPastDates?: boolean;
  error?: string;
  className?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ 
  label, 
  required, 
  value, 
  onChange, 
  type = 'date',
  min,
  isToday,
  allowPastDates = false,
  error,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Format display value
  const displayValue = useMemo(() => {
    if (!value) return '';
    if (type === 'date') {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
    }
    
    // For custom time slots, we might get 'any', '08-10', etc.
    // Standard HH:mm format check
    if (value.includes(':')) {
      const [h, m] = value.split(':');
      const d = new Date(2000, 0, 1, parseInt(h), parseInt(m));
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    
    return value;
  }, [value, type]);

  // Calendar Helpers
  const daysInMonth = (month: Date) => new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (month: Date) => new Date(month.getFullYear(), month.getMonth(), 1).getDay();

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    onChange({ target: { value: dateStr } });
    setIsOpen(false);
  };

  const handleTimeSelect = (time: string) => {
    onChange({ target: { value: time } });
    setIsOpen(false);
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };
  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };


  return (
    <div className={`w-full ${className}`}>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer group">
        <Input
          label={label}
          required={required}
          value={type === 'time' && value ? getTimeSlotLabel(value) : displayValue}
          readOnly
          placeholder={type === 'date' ? 'Choose Date' : 'Choose Time'}
          error={error}
          className="pointer-events-none group-hover:border-emerald-300 transition-colors bg-white shadow-sm text-[11px] font-bold placeholder:text-[10.5px] placeholder:font-black placeholder:uppercase placeholder:tracking-tighter py-2.5"
          leftIcon={
            type === 'date' ? (
              <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          }
          rightIcon={
            value && (
              <div className="bg-emerald-50 w-5 h-5 rounded-full flex items-center justify-center animate-scale-in">
                <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )
          }
        />
      </div>

      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={type === 'date' ? 'Pick a Date' : 'Choose Time Slot'}
        size="sm"
      >
        {type === 'date' ? (
          <div className="space-y-4 no-scrollbar overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <button 
                type="button"
                onClick={prevMonth} 
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100/50 rounded-2xl transition-colors border border-gray-50"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h4 className="font-black text-gray-800 uppercase tracking-widest text-xs flex flex-col items-center">
                <span>{currentMonth.toLocaleDateString([], { month: 'long' })}</span>
                <span className="text-[10px] text-gray-400 font-bold">{currentMonth.getFullYear()}</span>
              </h4>
              <button 
                type="button"
                onClick={nextMonth} 
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100/50 rounded-2xl transition-colors border border-gray-50"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-[10px] font-black text-gray-300 uppercase py-2">{day}</div>
              ))}
              
              {Array.from({ length: firstDayOfMonth(currentMonth) }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              
              {Array.from({ length: daysInMonth(currentMonth) }).map((_, i) => {
                const day = i + 1;
                const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                
                const today = new Date();
                const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                
                let isPast = false;
                
                // If past dates ARE NOT allowed, restrict to min date or future (if no min provided)
                if (!allowPastDates) {
                  const defaultMinStr = min || todayIso;
                  if (isoDate < defaultMinStr) {
                    isPast = true;
                  }
                  
                  // Special check for "Today": If past 3:30 PM, Today is disabled for booking
                  if (isoDate === todayIso) {
                    const cutoff = new Date(today);
                    cutoff.setHours(15, 30, 0, 0);
                    if (today.getTime() >= cutoff.getTime()) {
                      isPast = true;
                    }
                  }
                }
                
                const isSelected = value === isoDate;
                
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isPast}
                    onClick={() => handleDateSelect(day)}
                    className={`
                      relative w-full aspect-square rounded-2xl flex items-center justify-center text-sm font-bold transition-all
                      ${isSelected 
                        ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 scale-105 z-10' 
                        : 'hover:bg-emerald-50/50 text-gray-700'}
                      ${isPast ? 'text-gray-200 cursor-not-allowed opacity-40' : ''}
                    `}
                  >
                    {day}
                    {isSelected && <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full animate-pulse" />}
                  </button>
                );
              })}
            </div>
            
            <div className="pt-6 border-t border-gray-50 flex justify-center">
               <button 
                type="button"
                onClick={() => {
                  const today = new Date();
                  const cutoff = new Date(today);
                  cutoff.setHours(15, 30, 0, 0);
                  
                  // If today is disabled for booking, "Go to Today" actually goes to tomorrow
                  // But if we allow past dates (e.g. for history), it should always go to today
                  const shouldGoToTomorrow = !allowPastDates && today.getTime() >= cutoff.getTime();
                  const targetDate = shouldGoToTomorrow
                    ? new Date(today.getTime() + 24 * 60 * 60 * 1000) 
                    : today;
                    
                  const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
                  setCurrentMonth(targetDate);
                  onChange({ target: { value: dateStr } });
                  setIsOpen(false);
                }}
                className="px-6 py-2 bg-gray-50 hover:bg-emerald-50 rounded-full text-[10px] font-black text-gray-500 hover:text-emerald-600 tracking-widest uppercase transition-all duration-300 border border-transparent hover:border-emerald-100"
               >
                 {(() => {
                   const now = new Date();
                   const isAfterCutoff = now.getHours() > 15 || (now.getHours() === 15 && now.getMinutes() >= 30);
                   if (allowPastDates) return 'Go to Today';
                   return isAfterCutoff ? 'Available From Tomorrow' : 'Go to Today';
                 })()}
               </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 no-scrollbar overflow-hidden px-1">
             <div className="flex flex-col gap-2.5 pb-2">
              {TIME_SLOTS.map((slot) => {
                const isSelected = value === slot.value;
                let isPast = false;

                if (isToday) {
                  const now = new Date();
                  const cutoffTime = now.getTime() + 2 * 60 * 60 * 1000;
                  
                  if (slot.value.includes('-')) {
                    const [_, endStr] = slot.value.split('-');
                    const endHour = parseInt(endStr);
                    const slotEndTime = new Date(now);
                    slotEndTime.setHours(endHour, 0, 0, 0);
                    
                    if (cutoffTime >= slotEndTime.getTime()) {
                      isPast = true;
                    }
                  } else if (slot.value === 'any') {
                    // Disable "Any" if it's past the end of the last possible slot (7 PM)
                    const dayEndTime = new Date(now);
                    dayEndTime.setHours(19, 0, 0, 0);
                    if (cutoffTime >= dayEndTime.getTime()) {
                      isPast = true;
                    }
                  }
                }

                return (
                  <button
                    key={slot.value}
                    type="button"
                    disabled={isPast}
                    onClick={() => handleTimeSelect(slot.value)}
                    className={`
                      px-6 py-4 rounded-3xl border-2 font-black text-sm tracking-tight transition-all duration-300 text-left flex items-center justify-between
                      ${isSelected 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xl shadow-emerald-600/10' 
                        : (isPast ? 'bg-gray-50 border-gray-100 text-gray-200 cursor-not-allowed opacity-40' : 'bg-white border-gray-50 text-gray-400 hover:border-emerald-200 hover:text-gray-700')}
                    `}
                  >
                    <span>{slot.label}</span>
                    {isSelected && (
                      <svg className="w-5 h-5 text-emerald-600 animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
