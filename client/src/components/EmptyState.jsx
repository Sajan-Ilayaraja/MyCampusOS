import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Reusable EmptyState Component
 */
const EmptyState = ({ 
  title = 'No data available', 
  description = 'There is currently no information recorded in this section.',
  actionButton = null,
  icon: Icon = AlertCircle,
  className = '' 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 bg-[#0a0f1d]/30 border border-dashed border-slate-800/80 rounded-3xl text-center space-y-4 max-w-lg mx-auto my-6 ${className}`}>
      <div className="p-4 bg-slate-800/40 rounded-full text-indigo-400">
        <Icon className="w-8 h-8" />
      </div>
      <div className="space-y-1.5">
        <h4 className="font-heading text-sm font-bold text-white">{title}</h4>
        <p className="text-xs text-slate-450 leading-relaxed max-w-xs mx-auto">{description}</p>
      </div>
      {actionButton && <div className="pt-2">{actionButton}</div>}
    </div>
  );
};

export default EmptyState;
