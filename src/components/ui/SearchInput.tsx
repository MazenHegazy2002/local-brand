'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  loading?: boolean;
  suggestions?: React.ReactNode;
  className?: string;
}

export function SearchInput({
  value: controlledValue,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  debounceMs = 300,
  loading,
  suggestions,
  className = '',
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  const value = controlledValue ?? internalValue;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSubmit?.(newValue);
    }, debounceMs);
  }, [onChange, onSubmit, debounceMs]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSubmit?.(value);
  }, [value, onSubmit]);

  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange?.('');
    onSubmit?.('');
  }, [onChange, onSubmit]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 rounded-[var(--radius)] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
        />
        {(value || loading) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </button>
        )}
      </div>
      {isFocused && suggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[var(--radius)] shadow-lg border border-gray-100 z-50">
          {suggestions}
        </div>
      )}
    </form>
  );
}

export default SearchInput;