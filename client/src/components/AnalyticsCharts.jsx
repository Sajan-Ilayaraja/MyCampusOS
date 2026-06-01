import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import {
  TrendingUp,
  Calendar as CalendarIcon,
  Award,
  Layers as LayersIcon,
  HelpCircle,
  Sparkles,
  BarChart2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Memoized Chart Wrapper to optimize performance
const MemoizedChart = React.memo(({ children }) => {
  return children;
});

export const ProductivityCharts = ({ productivity, CHART_COLORS }) => {
  const hasProgress = Array.isArray(productivity?.weeklyProgress) && productivity.weeklyProgress.length > 0;
  const hasActiveDays = Array.isArray(productivity?.activeDays) && productivity.activeDays.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-grid">
      {/* 4-Week score progression */}
      <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between min-h-[330px] card-print">
        <div>
          <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>Productivity Score Progression</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Average score updates logged over the last 4 weeks</p>
        </div>
        
        <div className="flex-1 w-full h-[220px] text-xs mt-4">
          <ErrorBoundary>
            {hasProgress ? (
              <MemoizedChart>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={productivity.weeklyProgress} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="week" stroke="#64748b" tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937', color: '#f1f5f9' }} />
                    <Area type="monotone" dataKey="score" name="Productivity Score" stroke={CHART_COLORS[0]} strokeWidth={2.5} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </MemoizedChart>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-550 italic">No productivity progression data yet.</div>
            )}
          </ErrorBoundary>
        </div>
      </div>

      {/* Day level totals bar chart */}
      <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between min-h-[330px] card-print">
        <div>
          <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-400" />
            <span>Weekly Consistency Matrix</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Volume of interactions distributed by day of week</p>
        </div>

        <div className="flex-1 w-full h-[220px] text-xs mt-4">
          <ErrorBoundary>
            {hasActiveDays ? (
              <MemoizedChart>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productivity.activeDays} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="day" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937', color: '#f1f5f9' }} />
                    <Bar dataKey="count" name="Activities Count" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </MemoizedChart>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-550 italic">No weekly consistency data yet.</div>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export const TaskCharts = ({ tasks, CHART_COLORS }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-grid">
      {/* Task distribution by Priority level */}
      <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between min-h-[330px] card-print">
        <div>
          <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
            <LayersIcon className="w-4 h-4 text-sky-400" />
            <span>Task Volume & Status by Priority</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Total created versus completed tasks per priority tier</p>
        </div>

        <div className="flex-1 w-full h-[220px] text-xs mt-4">
          <ErrorBoundary>
            {tasks?.priorityData && Array.isArray(tasks.priorityData) && tasks.priorityData.length > 0 ? (
              <MemoizedChart>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tasks.priorityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="priority" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937', color: '#f1f5f9' }} />
                    <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                    <Bar dataKey="completed" name="Completed" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="total" name="Total Created" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </MemoizedChart>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-550 italic">No priority metrics logged yet.</div>
            )}
          </ErrorBoundary>
        </div>
      </div>

      {/* Task Completion progression line */}
      <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between min-h-[330px] card-print">
        <div>
          <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-pink-400" />
            <span>Daily Tasks Completion Timeline</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Chronological progress chart of completed tasks</p>
        </div>

        <div className="flex-1 w-full h-[220px] text-xs mt-4">
          <ErrorBoundary>
            {tasks?.completionByDay && Array.isArray(tasks.completionByDay) && tasks.completionByDay.length > 0 ? (
              <MemoizedChart>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tasks.completionByDay} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937', color: '#f1f5f9' }} />
                    <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke={CHART_COLORS[4]} strokeWidth={3} dot={{ stroke: CHART_COLORS[4], strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </MemoizedChart>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-550 italic">No chronological completions tracked.</div>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};


export const GoalCharts = ({ goals, CHART_COLORS }) => {
  return (
    <div className="grid grid-cols-1 gap-6 print-grid">
      <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between min-h-[330px] card-print">
        <div>
          <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Average Progress % by Goal Category</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Average checklist/numeric progress reached across categories</p>
        </div>

        <div className="flex-1 w-full h-[220px] text-xs mt-4">
          <ErrorBoundary>
            {goals?.categoryData && Array.isArray(goals.categoryData) && goals.categoryData.length > 0 ? (
              <MemoizedChart>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={goals.categoryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="category" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937', color: '#f1f5f9' }} />
                    <Bar dataKey="avgProgress" name="Average Progress %" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </MemoizedChart>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-550 italic">No goal category metrics logged.</div>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export const ComparisonCharts = ({ productivity, CHART_COLORS }) => {
  return (
    <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between min-h-[330px] card-print">
      <div>
        <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-indigo-400" />
          <span>Productivity Score Progression (4 Weeks comparison)</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">Weekly consistency index scores comparisons</p>
      </div>

      <div className="flex-1 w-full h-[220px] text-xs mt-4">
        <ErrorBoundary>
          {productivity?.weeklyProgress && Array.isArray(productivity.weeklyProgress) && productivity.weeklyProgress.length > 0 ? (
            <MemoizedChart>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productivity.weeklyProgress} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="week" stroke="#64748b" tickLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937', color: '#f1f5f9' }} />
                  <Bar dataKey="score" name="Week Score" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} barSize={24}>
                    {productivity.weeklyProgress.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 3 ? CHART_COLORS[1] : CHART_COLORS[0]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </MemoizedChart>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-550 italic">No score progression metrics available.</div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
};
