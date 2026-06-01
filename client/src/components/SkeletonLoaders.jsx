import React from 'react';

/**
 * Reusable pulse class helper
 */
const Pulse = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-800/80 rounded-xl ${className}`} />
);

/**
 * Dashboard Metrics Cards Grid Skeleton (6 columns layout)
 */
export const DashboardSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-[#0a0f1d]/75 border border-slate-850 rounded-2xl p-5 flex items-center gap-4">
          <Pulse className="w-12 h-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <Pulse className="h-3 w-16" />
            <Pulse className="h-4.5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * AI Assistant Chat/Workspace Skeleton
 */
export const AiResponseSkeleton = () => {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-2.5">
        <Pulse className="w-7 h-7 rounded-lg shrink-0" />
        <div className="bg-[#131b2e]/60 border border-slate-850 p-4 rounded-2xl rounded-tl-none flex-1 max-w-[80%] space-y-2">
          <Pulse className="h-3 w-full" />
          <Pulse className="h-3 w-[90%]" />
          <Pulse className="h-3 w-[70%]" />
        </div>
      </div>
      <div className="flex items-start gap-2.5 justify-end">
        <div className="bg-indigo-600/20 border border-indigo-500/10 p-4 rounded-2xl rounded-tr-none flex-1 max-w-[70%] space-y-2">
          <Pulse className="h-3 w-full" />
          <Pulse className="h-3 w-[80%]" />
        </div>
        <Pulse className="w-7 h-7 rounded-lg shrink-0" />
      </div>
    </div>
  );
};

/**
 * Notes Grid Skeleton
 */
export const NotesGridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-[#0a0f1d]/70 border border-slate-850 rounded-2xl p-4.5 space-y-4">
          <div className="flex justify-between items-start gap-3">
            <Pulse className="w-10 h-10 rounded-xl shrink-0" />
            <Pulse className="h-4 w-4 rounded-md" />
          </div>
          <div className="space-y-2">
            <Pulse className="h-3.5 w-3/4" />
            <Pulse className="h-2.5 w-1/2" />
          </div>
          <div className="pt-2 border-t border-slate-850 flex justify-between items-center">
            <Pulse className="h-3 w-16" />
            <Pulse className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Analytics Charts / Heatmap Panel Skeleton
 */
export const AnalyticsChartSkeleton = () => {
  return (
    <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-6 space-y-6 w-full">
      <div className="flex justify-between items-center">
        <div className="space-y-1.5">
          <Pulse className="h-4 w-44" />
          <Pulse className="h-2.5 w-64" />
        </div>
        <Pulse className="h-8 w-24 rounded-lg" />
      </div>
      <div className="h-[220px] flex items-end gap-3.5 px-4 pt-4 border-b border-slate-800">
        <Pulse className="h-[40%] flex-1" />
        <Pulse className="h-[75%] flex-1" />
        <Pulse className="h-[25%] flex-1" />
        <Pulse className="h-[90%] flex-1" />
        <Pulse className="h-[60%] flex-1" />
      </div>
      <div className="flex justify-between items-center text-xs">
        <Pulse className="h-3 w-20" />
        <Pulse className="h-3 w-32" />
      </div>
    </div>
  );
};
