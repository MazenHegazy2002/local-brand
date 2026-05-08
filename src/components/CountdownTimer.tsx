'use client';

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  endsAt: string | Date;
  onExpire?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

function formatTimeLeft(endsAt: Date) {
  const diff = endsAt.getTime() - Date.now();
  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { expired: false, days, hours, minutes, seconds };
}

export default function CountdownTimer({
  endsAt,
  onExpire,
  className = '',
  size = 'md',
  label,
}: CountdownTimerProps) {
  const target = endsAt instanceof Date ? endsAt : new Date(endsAt);
  const [t, setT] = useState(() => formatTimeLeft(target));

  useEffect(() => {
    const id = setInterval(() => {
      const next = formatTimeLeft(target);
      setT(next);
      if (next.expired && onExpire) onExpire();
    }, 1000);
    return () => clearInterval(id);
  }, [target, onExpire]);

  const sizeClasses = {
    sm: { box: 'w-9 h-9 text-xs', label: 'text-[9px]', gap: 'gap-1' },
    md: { box: 'w-12 h-12 text-base', label: 'text-[10px]', gap: 'gap-2' },
    lg: { box: 'w-16 h-16 text-2xl', label: 'text-xs', gap: 'gap-3' },
  }[size];

  if (t.expired) {
    return <span className={`text-xs font-bold text-red-500 ${className}`}>Sale ended</span>;
  }

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      {label && <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</div>}
      <div className={`flex items-center ${sizeClasses.gap}`}>
        {t.days > 0 && (
          <>
            <TimeBox value={t.days} label="days" sizeClasses={sizeClasses} />
            <span className="font-black text-slate-400">:</span>
          </>
        )}
        <TimeBox value={t.hours} label="hrs" sizeClasses={sizeClasses} />
        <span className="font-black text-slate-400">:</span>
        <TimeBox value={t.minutes} label="min" sizeClasses={sizeClasses} />
        <span className="font-black text-slate-400">:</span>
        <TimeBox value={t.seconds} label="sec" sizeClasses={sizeClasses} />
      </div>
    </div>
  );
}

function TimeBox({
  value,
  label,
  sizeClasses,
}: {
  value: number;
  label: string;
  sizeClasses: { box: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`${sizeClasses.box} rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 text-white font-black flex items-center justify-center shadow-sm`}
      >
        {value.toString().padStart(2, '0')}
      </div>
      <span className={`${sizeClasses.label} font-bold text-slate-400 uppercase mt-1`}>{label}</span>
    </div>
  );
}
