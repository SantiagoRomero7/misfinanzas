import React from 'react';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'success' | 'expense' | 'neutral' | 'primary';
};

export const Badge = ({ className = '', variant = 'neutral', children, ...props }: BadgeProps) => {
  const variants = {
    success: 'bg-success/10 text-success',
    expense: 'bg-expense/10 text-expense',
    neutral: 'bg-slate-100 text-slate-600',
    primary: 'bg-primary/10 text-primary',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
