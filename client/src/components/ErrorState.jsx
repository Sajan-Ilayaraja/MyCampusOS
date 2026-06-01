import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Reusable ErrorState Component
 * Supports retry callbacks and refresh triggers to recover gracefully.
 */
const ErrorState = ({ 
  message = 'Unable to load content', 
  errorDetails = '', 
  onRetry = null, 
  className = '' 
}) => {
  return (
    <div className={`bg-red-500/5 border border-red-500/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto my-6 ${className}`}>
      <div className="p-3.5 bg-red-500/10 rounded-full text-red-400">
        <AlertTriangle className="w-7 h-7" />
      </div>
      
      <div className="space-y-1.5">
        <h4 className="font-heading text-sm font-bold text-white">{message}</h4>
        {errorDetails && (
          <p className="text-[10px] text-slate-500 bg-black/40 border border-slate-850 px-3 py-1.5 rounded-lg max-w-sm mx-auto font-mono break-all leading-normal">
            {errorDetails}
          </p>
        )}
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;
