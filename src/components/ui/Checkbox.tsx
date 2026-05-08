'use client';

import { InputHTMLAttributes, forwardRef, useId } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const fallbackId = useId();
    const checkboxId = id || fallbackId;

    return (
      <div className="flex items-start gap-3">
        <div className="relative mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={`
              peer sr-only
              ${className}
            `}
            {...props}
          />
          <label
            htmlFor={checkboxId}
            className={`
              flex items-center justify-center w-5 h-5 rounded border-2 cursor-pointer
              transition-all duration-200
              ${error ? 'border-red-500' : 'border-gray-300'}
              peer-checked:bg-[hsl(var(--primary))] peer-checked:border-[hsl(var(--primary))]
              peer-focus:ring-2 peer-focus:ring-[hsl(var(--ring))] peer-focus:ring-offset-2
              peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
              hover:border-[hsl(var(--primary))]
            `}
          >
            <svg
              className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </label>
        </div>
        {label && (
          <label
            htmlFor={checkboxId}
            className={`
              text-sm text-[hsl(var(--foreground))]
              cursor-pointer
              ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {label}
          </label>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;