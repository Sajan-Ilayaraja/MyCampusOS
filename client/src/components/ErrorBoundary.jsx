import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Only log error inside development environment (localhost/127.0.0.1)
    const isDev = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    if (isDev) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2.5">
          <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
          <h4 className="font-heading text-xs font-bold text-white">Temporary Component Failure</h4>
          <p className="text-[10px] text-slate-450 leading-normal max-w-xs">
            We encountered an issue loading this layout section. Try refreshing the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
