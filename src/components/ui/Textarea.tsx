'use client';

import { TextareaHTMLAttributes, forwardRef, useEffect, useRef, useState } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  autoResize?: boolean;
  showCharCount?: boolean;
  maxLength?: number;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, autoResize, showCharCount, maxLength, required, className = '', id, value, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const selectId = id || `textarea-${Math.random().toString(36).slice(2)}`;
    const [localValue, setLocalValue] = useState(value as string || '');

    useEffect(() => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [localValue, autoResize]);

    const charCount = typeof value === 'string' ? value.length : (localValue as string)?.length || 0;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-semibold text-[hsl(var(--foreground))] mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={(el) => {
            (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
            if (ref && typeof ref === 'object') ref.current = el;
          }}
          id={selectId}
          required={required}
          maxLength={maxLength}
          value={value}
          onChange={(e) => setLocalValue(e.target.value)}
          className={`
            w-full px-4 py-2.5 rounded-[var(--radius)] border transition-all duration-200
            bg-white text-[hsl(var(--foreground))]
            placeholder:text-gray-400 resize-none
            focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${autoResize ? 'overflow-hidden' : ''}
            ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-[hsl(var(--input))]'}
            ${className}
          `}
          {...props}
        />
        <div className="flex justify-between mt-1.5">
          {(error || helperText) && (
            <p className={`text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}>
              {error || helperText}
            </p>
          )}
          {showCharCount && maxLength && (
            <p className={`text-sm ml-auto ${charCount >= maxLength ? 'text-red-500' : 'text-gray-400'}`}>
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;