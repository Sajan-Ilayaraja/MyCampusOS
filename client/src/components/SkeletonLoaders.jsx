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

/**
 * Task Card / Row Item Skeleton
 */
export const TaskCardSkeleton = () => {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-[#0a0f1d]/75 border border-slate-850 rounded-2xl p-4.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <Pulse className="w-5 h-5 rounded-md shrink-0" />
            <div className="space-y-2 flex-1">
              <Pulse className="h-3.5 w-1/3" />
              <Pulse className="h-2.5 w-1/2" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Pulse className="w-14 h-6 rounded-lg" />
            <Pulse className="w-20 h-6 rounded-lg" />
            <Pulse className="w-8 h-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Goal Card Skeleton
 */
export const GoalSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-[#0a0f1d]/75 border border-slate-850 rounded-3xl p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <Pulse className="h-4.5 w-1/2" />
              <Pulse className="h-3 w-3/4" />
            </div>
            <Pulse className="w-16 h-6 rounded-lg shrink-0" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="flex justify-between">
              <Pulse className="h-3 w-20" />
              <Pulse className="h-3 w-10" />
            </div>
            <Pulse className="h-2 w-full rounded-full" />
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-850/60">
            <Pulse className="h-3 w-24" />
            <Pulse className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Profile Page Skeleton
 */
export const ProfileSkeleton = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner Block */}
      <div className="bg-[#0a0f1d]/75 border border-slate-850 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <Pulse className="w-24 h-24 rounded-full shrink-0" />
        <div className="space-y-2.5 flex-1 min-w-0 text-center sm:text-left">
          <Pulse className="h-5 w-48 mx-auto sm:mx-0" />
          <Pulse className="h-3 w-36 mx-auto sm:mx-0" />
          <Pulse className="h-3.5 w-64 mx-auto sm:mx-0" />
        </div>
      </div>

      {/* Profile Form Details Cards */}
      <div className="bg-[#0a0f1d]/75 border border-slate-850 rounded-3xl p-6 space-y-6">
        <div className="h-5 w-32 border-b border-slate-850 pb-2">
          <Pulse className="h-3.5 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Pulse className="h-3 w-24" />
              <Pulse className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-3">
          <Pulse className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

/**
 * AI Study Plan / Calendar Skeleton
 */
export const StudyPlanSkeleton = ({ streamText }) => {
  return (
    <div className="bg-[#0a0f1d]/70 border border-slate-850 rounded-3xl p-6 space-y-6 animate-pulse">
      <div className="flex justify-between items-center pb-4 border-b border-slate-850/60">
        <div className="space-y-2">
          <Pulse className="h-5 w-48" />
          <Pulse className="h-3.5 w-32" />
        </div>
        <Pulse className="w-20 h-6 rounded-lg" />
      </div>
      
      {/* Timeline slots */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#131b2e]/40 border border-slate-850/50 rounded-2xl p-4 flex gap-4 items-start">
            <Pulse className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2.5">
              <Pulse className="h-4 w-1/3" />
              <Pulse className="h-3 w-3/4" />
              <div className="flex gap-2 pt-1.5">
                <Pulse className="w-16 h-5 rounded-md" />
                <Pulse className="w-20 h-5 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {streamText && (
        <div className="pt-4 border-t border-slate-850/60 font-mono text-[10px] text-slate-500 whitespace-pre-wrap truncate h-32 opacity-40">
          {streamText}
        </div>
      )}
    </div>
  );
};

/**
 * AI Lecture Summary / Notes Skeleton
 */
export const NotesSummarySkeleton = ({ streamText }) => {
  return (
    <div className="bg-[#0a0f1d]/70 border border-slate-855 rounded-3xl p-6 space-y-6 animate-pulse">
      <div className="space-y-2 pb-4 border-b border-slate-850/60">
        <Pulse className="h-5 w-64" />
        <Pulse className="h-3 w-40" />
      </div>

      {/* Main summary paragraph */}
      <div className="space-y-2.5">
        <Pulse className="h-3.5 w-full" />
        <Pulse className="h-3.5 w-[95%]" />
        <Pulse className="h-3.5 w-[90%]" />
        <Pulse className="h-3.5 w-[85%]" />
      </div>

      {/* Bullet points */}
      <div className="space-y-3 pt-2">
        <Pulse className="h-4 w-32" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 items-center pl-2">
            <Pulse className="w-2 h-2 rounded-full shrink-0" />
            <Pulse className="h-3 w-4/5" />
          </div>
        ))}
      </div>

      {streamText && (
        <div className="pt-4 border-t border-slate-850/60 font-mono text-[10px] text-slate-500 whitespace-pre-wrap truncate h-32 opacity-40">
          {streamText}
        </div>
      )}
    </div>
  );
};

/**
 * Flashcard Deck Skeleton
 */
export const FlashcardSkeleton = () => {
  return (
    <div className="bg-[#0a0f1d]/70 border border-slate-850 rounded-3xl p-6 space-y-6 max-w-lg mx-auto animate-pulse text-center">
      <div className="h-4.5 bg-slate-800/80 rounded-lg w-1/3 mx-auto" />
      <div className="h-64 w-full rounded-2xl border border-slate-855/80 bg-[#131b2e]/40 flex flex-col justify-center items-center p-6 space-y-4">
        <Pulse className="w-12 h-12 rounded-full" />
        <Pulse className="h-4.5 w-2/3" />
        <Pulse className="h-3.5 w-1/2" />
      </div>
      <div className="flex justify-center gap-3.5 pt-2">
        <Pulse className="w-24 h-9 rounded-xl" />
        <Pulse className="w-24 h-9 rounded-xl" />
      </div>
    </div>
  );
};

/**
 * Career Path Roadmap Skeleton
 */
export const CareerAdvisorSkeleton = ({ streamText }) => {
  return (
    <div className="bg-[#0a0f1d]/70 border border-slate-855 rounded-3xl p-6 space-y-6 animate-pulse">
      <div className="space-y-2 pb-4 border-b border-slate-850/60">
        <Pulse className="h-5 w-56" />
        <Pulse className="h-3.5 w-40" />
      </div>

      {/* Nodes list representing steps */}
      <div className="space-y-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <Pulse className="w-8 h-8 rounded-full shrink-0" />
              {i < 2 && <div className="w-0.5 h-10 bg-slate-800/60 my-1.5" />}
            </div>
            <div className="flex-1 space-y-2.5 pt-1">
              <Pulse className="h-4 w-1/4" />
              <Pulse className="h-3 w-5/6" />
              <div className="flex gap-1.5 pt-1">
                <Pulse className="w-12 h-4.5 rounded-md" />
                <Pulse className="w-16 h-4.5 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {streamText && (
        <div className="pt-4 border-t border-slate-850/60 font-mono text-[10px] text-slate-500 whitespace-pre-wrap truncate h-32 opacity-40">
          {streamText}
        </div>
      )}
    </div>
  );
};

/**
 * AI Quiz Skeleton
 */
export const QuizSkeleton = () => {
  return (
    <div className="bg-[#0a0f1d]/70 border border-slate-850 p-6 rounded-3xl space-y-6 max-w-lg mx-auto animate-pulse">
      <div className="flex justify-between items-center pb-3 border-b border-slate-850">
        <Pulse className="h-4 w-1/4" />
        <Pulse className="h-4 w-1/6" />
      </div>
      <div className="space-y-3">
        <Pulse className="h-4 w-3/4" />
        <Pulse className="h-4 w-1/2" />
      </div>
      <div className="space-y-3 pt-4">
        {[1, 2, 3, 4].map(idx => (
          <div key={idx} className="h-10 bg-slate-900 border border-slate-850/60 rounded-xl w-full" />
        ))}
      </div>
      <div className="flex justify-between items-center pt-4">
        <Pulse className="h-8 w-1/4 rounded-xl" />
        <Pulse className="h-8 w-1/4 rounded-xl" />
      </div>
      <div className="text-center text-slate-550 text-[10px] uppercase font-bold tracking-wider pt-2">
        CampusBuddy is compiling custom questions...
      </div>
    </div>
  );
};
