import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] cursor-pointer select-none';

  const variants = {
    primary:
      'bg-[#087F5B] text-white hover:bg-[#155E46] focus-visible:ring-[#087F5B] shadow-sm shadow-[#087F5B]/25 disabled:bg-[#A3D6C5] disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100',
    secondary:
      'bg-white text-[#20352C] border border-[#E5EAE3] hover:bg-[#F9F7EF] hover:border-[#C8D6C8] focus-visible:ring-[#087F5B] shadow-2xs disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed disabled:active:scale-100',
    danger:
      'bg-[#E86D5A] text-white hover:bg-[#C94B38] focus-visible:ring-[#E86D5A] shadow-sm shadow-[#E86D5A]/25 disabled:bg-[#F8C0B8] disabled:cursor-not-allowed disabled:active:scale-100',
    ghost:
      'bg-transparent text-[#6B7C72] hover:bg-[#DFF5E8]/50 hover:text-[#155E46] focus-visible:ring-[#087F5B] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs rounded-xl min-h-[42px]',
    md: 'px-4 py-2.5 text-sm rounded-xl min-h-[46px]',
    lg: 'px-6 py-3.5 text-base rounded-2xl min-h-[52px]',
  };

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading && <Loader2 size={16} className="animate-spin shrink-0" />}
      {children}
    </button>
  );
}
