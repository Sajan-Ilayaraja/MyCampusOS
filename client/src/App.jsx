import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages for bundle optimization & chunk splitting (Item 4)
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TaskManager = lazy(() => import('./pages/TaskManager'));
const AcademicPlanner = lazy(() => import('./pages/AcademicPlanner'));
const NotesVault = lazy(() => import('./pages/NotesVault'));
const GoalTracker = lazy(() => import('./pages/GoalTracker'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const OAuthSuccess = lazy(() => import('./pages/OAuthSuccess'));
const Profile = lazy(() => import('./pages/Profile'));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Toast alerts config */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid rgba(51, 65, 85, 0.6)',
              borderRadius: '12px',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#6366f1',
                secondary: '#ffffff',
              },
            },
          }}
        />
        
        {/* Suspense fallback rendering during lazy bundle loads */}
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-4 text-slate-400 text-xs font-semibold animate-pulse">Loading workspace page...</p>
          </div>
        }>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/oauth-success" element={<OAuthSuccess />} />

            {/* Protected Main Routes (Require Login) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                <Route path="/tasks" element={<TaskManager />} />
                <Route path="/planner" element={<AcademicPlanner />} />
                <Route path="/notes" element={<ErrorBoundary><NotesVault /></ErrorBoundary>} />
                <Route path="/goals" element={<GoalTracker />} />
                <Route path="/analytics" element={<ErrorBoundary><AnalyticsDashboard /></ErrorBoundary>} />
                <Route path="/ai" element={<ErrorBoundary><AIAssistant /></ErrorBoundary>} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>

            {/* Catch-all Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
