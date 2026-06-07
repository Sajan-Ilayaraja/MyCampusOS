import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  Calendar,
  FileText,
  Target,
  BarChart3,
  LogOut,
  Menu,
  X,
  User,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Touch gestures for swipe-close drawer
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    if (isLeftSwipe && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  // Auto-collapse sidebar on tablet screen widths
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1280) {
        setSidebarCollapsed(true);
      } else if (window.innerWidth >= 1280) {
        setSidebarCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // run on initial mount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when mobile menu is active
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [mobileMenuOpen]);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Planner', path: '/planner', icon: Calendar },
    { name: 'Notes Vault', path: '/notes', icon: FileText },
    { name: 'Goal Tracker', path: '/goals', icon: Target },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'CampusBuddy', path: '/ai', icon: Sparkles },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-[#070b13] text-slate-100 font-sans min-h-screen-dvh">
      {/* 1. Sidebar for Desktop and Tablet */}
      <aside 
        className={`hidden md:flex flex-col bg-[#0a0f1d] border-r border-slate-800/60 sticky top-0 h-screen z-20 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand / Logo */}
        <div className={`flex items-center gap-3 px-6 py-5 border-b border-slate-800/60 ${sidebarCollapsed ? 'justify-center px-2' : ''}`}>
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/20 shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-heading text-lg font-bold tracking-wide text-white truncate animate-fade-in">
              MyCampus<span className="text-indigo-400">OS</span>
            </span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                title={sidebarCollapsed ? item.name : undefined}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-3.5'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                } ${sidebarCollapsed ? 'justify-center px-0 pl-0 border-l-0' : ''}`}
              >
                {isActive && sidebarCollapsed && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-indigo-500 rounded-r" />
                )}
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 shrink-0 ${
                  isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-300'
                }`} />
                {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Toggle collapse controls */}
        <div className="border-t border-slate-800/60 bg-[#080d19]/80 flex flex-col gap-3 p-4">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            {user?.profileImage || user?.avatar ? (
              <img
                src={user.profileImage || user.avatar}
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover border border-slate-800 shrink-0"
              />
            ) : (
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 shrink-0">
                <User className="w-5 h-5" />
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Student'}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          
          <button
            onClick={logout}
            title={sidebarCollapsed ? "Sign Out" : undefined}
            className={`flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 cursor-pointer transition-all duration-200 ${
              sidebarCollapsed ? 'px-0' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>

          {/* Toggle Button for collapsing sidebar */}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden xl:flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-750 text-slate-400 hover:text-white transition-all cursor-pointer mt-1 self-center"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* 2. Mobile Nav Header */}
      <div className="md:hidden fixed top-0 inset-x-0 h-16 bg-[#0a0f1d] border-b border-slate-800/60 flex items-center justify-between px-4 z-30 safe-pt">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 shadow">
            <GraduationCap className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-heading text-base font-bold text-white">
            MyCampus<span className="text-indigo-400">OS</span>
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Backdrop */}
      <div 
        className={`md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Drawer Panel */}
      <aside
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`md:hidden fixed inset-y-0 left-0 w-72 bg-[#0a0f1d] border-r border-slate-800/60 z-40 flex flex-col transition-transform duration-300 ease-in-out transform ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/60 safe-pt">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-md">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading text-lg font-bold tracking-wide text-white">
              MyCampus<span className="text-indigo-400">OS</span>
            </span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto scroll-momentum">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[48px] ${
                  isActive ? 'bg-indigo-600/15 text-indigo-400' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800/60 bg-[#080d19]/80 safe-pb">
          <div className="flex items-center gap-3 mb-4">
            {user?.profileImage || user?.avatar ? (
              <img
                src={user.profileImage || user.avatar}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover border border-slate-800 shrink-0"
              />
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 shrink-0">
                <User className="w-5 h-5" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              logout();
            }}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium rounded-xl transition-all cursor-pointer min-h-[44px]"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 3. Main Dashboard Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0 max-w-[1920px] mx-auto w-full">
        {/* Top Navbar for Desktop */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 border-b border-slate-800/40 bg-[#070b13] sticky top-0 z-10 safe-pt">
          <h2 className="text-sm font-semibold text-slate-400 truncate">
            Welcome back, <span className="text-slate-200">{user?.name}</span>
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-500 font-medium">
              Role: <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">Student</span>
            </div>
          </div>
        </header>

        {/* Page Content viewport */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto scroll-momentum safe-pb">
          <div key={location.pathname} className="animate-route-transition">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
