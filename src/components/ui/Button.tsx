'use client';

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: 'bg-[hsl(var(--primary))] text-white hover:opacity-90',
  secondary: 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent-hover))]',
  outline: 'border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] bg-transparent hover:bg-[hsl(var(--primary))] hover:text-white',
  ghost: 'bg-transparent text-[hsl(var(--foreground))] hover:bg-black/5',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3.5 text-lg',
};

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', loading, fullWidth, iconLeft, iconRight, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius)] transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading && <Spinner className="w-4 h-4" />}
        {iconLeft && !loading && <span className="flex-shrink-0">{iconLeft}</span>}
        {children}
        {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export const ButtonPrimary = (props: ButtonProps) => <Button variant="default" {...props} />;
export const ButtonSecondary = (props: ButtonProps) => <Button variant="secondary" {...props} />;
export const ButtonOutline = (props: ButtonProps) => <Button variant="outline" {...props} />;
export const ButtonGhost = (props: ButtonProps) => <Button variant="ghost" {...props} />;
export const ButtonDestructive = (props: ButtonProps) => <Button variant="destructive" {...props} />;

export default Button;