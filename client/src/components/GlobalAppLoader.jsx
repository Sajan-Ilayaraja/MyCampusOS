import React, { useState, useEffect } from 'react';
import { GraduationCap } from 'lucide-react';

const MESSAGES = [
  "Initializing Workspace...",
  "Loading Campus Data...",
  "Syncing Productivity Engine...",
  "Preparing CampusBuddy...",
  "Almost Ready..."
];

const GlobalAppLoader = ({ fadeOut = false }) => {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070b13] transition-opacity duration-[800ms] ${
      fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
    }`}>
      {/* Dynamic Pulsing Radial Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[35rem] h-[35rem] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none animate-pulse"></div>

      {/* Floating Particles (Decorative) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-1 h-1 bg-indigo-400/30 rounded-full animate-ping [animation-duration:3s]"></div>
        <div className="absolute top-2/3 left-2/3 w-1.5 h-1.5 bg-violet-400/20 rounded-full animate-ping [animation-duration:4s]"></div>
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-sky-400/40 rounded-full animate-ping [animation-duration:5s]"></div>
      </div>

      <div className="relative flex flex-col items-center max-w-sm px-4">
        {/* Core Glassmorphic Orb & Rotating Rings */}
        <div className="relative w-36 h-36 flex items-center justify-center mb-10">
          
          {/* Inner Rotating Ring */}
          <div className="absolute inset-0 rounded-full border border-dashed border-indigo-500/20 animate-[spin_12s_linear_infinite]" />
          
          {/* Outer Rotating Ring */}
          <div className="absolute -inset-4 rounded-full border border-indigo-500/30 border-t-transparent border-b-transparent animate-[spin_4s_linear_infinite]" />
          
          {/* Pulsing Backglow Orb */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-indigo-500/15 to-violet-500/15 blur-md animate-pulse" />
          
          {/* Glassmorphic Shield & Logo */}
          <div className="relative w-24 h-24 rounded-3xl bg-[#0f172a]/45 backdrop-blur-xl border border-slate-700/40 flex items-center justify-center shadow-2xl shadow-indigo-500/10">
            <GraduationCap className="w-12 h-12 text-indigo-400 animate-[pulse_2.5s_ease-in-out_infinite]" />
          </div>

          {/* Floating glowing dot */}
          <div className="absolute w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.8)] -top-4 animate-[spin_4s_linear_infinite] origin-[72px_72px]" />
        </div>

        {/* Brand Text */}
        <h2 className="font-heading text-2xl font-black text-white tracking-wide mb-2">
          MyCampus<span className="text-indigo-400">OS</span>
        </h2>
        
        {/* Text Loader Progression */}
        <div className="h-6 flex items-center justify-center overflow-hidden">
          <p 
            key={msgIdx} 
            className="text-[11px] font-bold text-slate-500 uppercase tracking-widest animate-[fadeInUp_0.4s_ease-out]"
          >
            {MESSAGES[msgIdx]}
          </p>
        </div>

        {/* Tiny Progress Tracker Bar */}
        <div className="w-48 h-0.5 bg-slate-900 rounded-full overflow-hidden mt-6">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full animate-[loadingProgress_10s_ease-in-out_infinite]" />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
            filter: blur(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        @keyframes loadingProgress {
          0% { width: 5%; }
          30% { width: 45%; }
          65% { width: 75%; }
          100% { width: 95%; }
        }
      `}} />
    </div>
  );
};

export default GlobalAppLoader;
