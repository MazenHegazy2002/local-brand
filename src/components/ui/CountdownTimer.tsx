'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: Date | string | number;
  onExpire?: () => void;
  compact?: boolean;
  variant?: 'default' | 'accent';
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeLeft(targetDate: Date | string | number): TimeLeft {
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const difference = target - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
}

export function CountdownTimer({ targetDate, onExpire, compact = false, variant = 'default', className = '' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = calculateTimeLeft(targetDate);
      setTimeLeft(newTime);
      
      if (newTime.total <= 0) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  if (timeLeft.total <= 0) {
    return (
      <div className={`text-center ${className}`}>
        <span className="text-red-500 font-bold">Expired</span>
      </div>
    );
  }

  const bgColor = variant === 'accent' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--primary))] text-white';
  const compactBg = variant === 'accent' ? 'bg-amber-100 text-amber-800' : 'bg-gray-900 text-white';

  if (compact) {
    const parts = [
      timeLeft.days > 0 && `${timeLeft.days}d`,
      `${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`
    ].filter(Boolean).join(' ');
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-bold ${compactBg} ${className}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        {parts}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {timeLeft.days > 0 && (
        <div className={`flex flex-col items-center p-2 rounded-lg ${bgColor}`}>
          <span className="text-2xl font-black">{String(timeLeft.days).padStart(2, '0')}</span>
          <span className="text-[10px] font-semibold uppercase">Days</span>
        </div>
      )}
      <span className={`text-2xl font-black ${bgColor ? 'text-white' : 'text-[hsl(var(--primary))]'}`}>:</span>
      <div className={`flex flex-col items-center p-2 rounded-lg ${bgColor}`}>
        <span className="text-2xl font-black">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-[10px] font-semibold uppercase">Hours</span>
      </div>
      <span className={`text-2xl font-black ${bgColor ? 'text-white' : 'text-[hsl(var(--primary))]'}`}>:</span>
      <div className={`flex flex-col items-center p-2 rounded-lg ${bgColor}`}>
        <span className="text-2xl font-black">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-[10px] font-semibold uppercase">Min</span>
      </div>
      <span className={`text-2xl font-black ${bgColor ? 'text-white' : 'text-[hsl(var(--primary))]'}`}>:</span>
      <div className={`flex flex-col items-center p-2 rounded-lg ${bgColor}`}>
        <span className="text-2xl font-black">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-[10px] font-semibold uppercase">Sec</span>
      </div>
    </div>
  );
}

export default CountdownTimer;