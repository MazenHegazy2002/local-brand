'use client';

import { InputHTMLAttributes, forwardRef, ReactNode, useId } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'> {
  label?: string;
  error?: string;
  helperText?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, prefix, suffix, required, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-[hsl(var(--foreground))] mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-gray-400 flex items-center justify-center pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            required={required}
            className={`
              w-full px-4 py-2.5 rounded-[var(--radius)] border transition-all duration-200
              bg-white text-[hsl(var(--foreground))]
              placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${prefix ? 'pl-10' : ''}
              ${suffix ? 'pr-10' : ''}
              ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-[hsl(var(--input))]'}
              ${className}
            `}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-gray-400 flex items-center justify-center pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        {(error || helperText) && (
          <p className={`mt-1.5 text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;