import React from 'react';

/**
 * Reusable LoadingState Component
 */
const LoadingState = ({ message = 'Loading content...', className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 min-h-[200px] w-full text-center ${className}`}>
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
        <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
      </div>
      <p className="mt-4 text-slate-400 text-xs font-semibold animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingState;
