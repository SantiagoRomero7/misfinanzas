import React from 'react';

export const Card = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${className}`} {...props}>
    {children}
  </div>
);
