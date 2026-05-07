'use client';

import { useState, useCallback } from 'react';

interface QuantitySelectorProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export function QuantitySelector({ value, min = 1, max = 999, onChange, disabled, className = '' }: QuantitySelectorProps) {
  const [inputValue, setInputValue] = useState(String(value));

  const handleDecrement = useCallback(() => {
    if (value > min) onChange(value - 1);
  }, [value, min, onChange]);

  const handleIncrement = useCallback(() => {
    if (value < max) onChange(value + 1);
  }, [value, max, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    let num = parseInt(inputValue, 10);
    if (isNaN(num)) num = min;
    if (num < min) num = min;
    if (num > max) num = max;
    setInputValue(String(num));
    onChange(num);
  };

  const isAtMin = value <= min;
  const isAtMax = value >= max;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleDecrement}
        disabled={disabled || isAtMin}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-bold"
      >
        −
      </button>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        disabled={disabled}
        className="w-14 h-9 text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] disabled:opacity-50"
      />
      <button
        onClick={handleIncrement}
        disabled={disabled || isAtMax}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-bold"
      >
        +
      </button>
    </div>
  );
}

export default QuantitySelector;