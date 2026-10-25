import React from 'react';

interface BadgeProps {
  variant?: 'green' | 'amber' | 'red' | 'blue' | 'gray';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  const variants = {
    green: 'bg-[#DFF5E8] text-[#155E46] border border-[#C1EBD2]',
    amber: 'bg-[#FFF4E0] text-[#8D5300] border border-[#FCD59A]',
    red: 'bg-[#FDF2F0] text-[#B53826] border border-[#F8C0B8]',
    blue: 'bg-[#EBF5FA] text-[#1E40AF] border border-[#BFDBFE]',
    gray: 'bg-[#F2F4F0] text-[#6B7C72] border border-[#E5EAE3]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold leading-normal transition-colors select-none ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
