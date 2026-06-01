import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Award, Calendar, FileText, Target } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const DashboardCharts = ({ analytics }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default: return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
  };

  if (!analytics) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tasks by Priority chart */}
      <ErrorBoundary>
        <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between min-h-[350px]">
          <div className="mb-4">
            <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Tasks by Priority</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Completed vs pending tasks across priority groups</p>
          </div>

          <div className="flex-1 w-full h-[240px] text-xs">
            {Array.isArray(analytics.taskPriorityData) && analytics.taskPriorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.taskPriorityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="priority" stroke="#64748b" tickLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid #1f2937',
                      borderRadius: '10px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-550 italic">
                No task priority data.
              </div>
            )}
          </div>
        </div>
      </ErrorBoundary>

      {/* Weekly Class Load chart */}
      {Array.isArray(analytics.classesPerDayData) && (
        <ErrorBoundary>
          <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between min-h-[350px]">
            <div className="mb-4">
              <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-400" />
                <span>Weekly Class Load</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Number of scheduled lectures per day</p>
            </div>

            <div className="flex-1 w-full h-[240px] text-xs">
              {analytics.classesPerDayData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.classesPerDayData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="day" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid #1f2937',
                        borderRadius: '10px',
                        color: '#f1f5f9'
                      }}
                    />
                    <Bar dataKey="count" name="Classes Scheduled" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-550 italic">
                  No classes scheduled.
                </div>
              )}
            </div>
          </div>
        </ErrorBoundary>
      )}

      {/* Credit Weight per Subject chart */}
      {Array.isArray(analytics.creditDistributionData) && (
        <ErrorBoundary>
          <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between min-h-[350px]">
            <div className="mb-4">
              <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" />
                <span>Credit Weight Distribution</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribution of academic credits across courses</p>
            </div>

            <div className="flex-1 w-full h-[240px] text-xs">
              {analytics.creditDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.creditDistributionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="subject" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid #1f2937',
                        borderRadius: '10px',
                        color: '#f1f5f9'
                      }}
                    />
                    <Bar dataKey="credits" name="Credits" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-550 italic">
                  No credit distribution data.
                </div>
              )}
            </div>
          </div>
        </ErrorBoundary>
      )}

      {/* Notes by Folder chart */}
      {Array.isArray(analytics.notesBySubjectData) && (
        <ErrorBoundary>
          <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between min-h-[350px]">
            <div className="mb-4">
              <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Notes by Folder</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribution of study notes across folder categories</p>
            </div>

            <div className="flex-1 w-full h-[240px] text-xs">
              {analytics.notesBySubjectData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-550 italic">
                  No notes uploaded yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.notesBySubjectData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="subject" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid #1f2937',
                        borderRadius: '10px',
                        color: '#f1f5f9'
                      }}
                    />
                    <Bar dataKey="count" name="Notes Stored" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </ErrorBoundary>
      )}

      {/* Goals Category Chart */}
      {Array.isArray(analytics.goalsCategoryData) && (
        <ErrorBoundary>
          <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between min-h-[350px]">
            <div className="mb-4">
              <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-400" />
                <span>Goals Category Breakdown</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Completed vs pending goals across categories</p>
            </div>

            <div className="flex-1 w-full h-[240px] text-xs">
              {analytics.goalsCategoryData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-550 italic">
                  No goals tracked yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.goalsCategoryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="category" stroke="#64748b" tickLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid #1f2937',
                        borderRadius: '10px',
                        color: '#f1f5f9'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="pending" name="Pending" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
};

export default DashboardCharts;
