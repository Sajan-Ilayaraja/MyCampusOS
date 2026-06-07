import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';
import {
  User,
  Mail,
  Calendar,
  GraduationCap,
  Building,
  BookOpen,
  Award,
  Activity,
  Sparkles,
  Lock,
  Trash2,
  Camera,
  Save,
  LogOut,
  Globe,
  Check,
  AlertTriangle,
  X,
  Flame,
  CheckCircle2,
  FileText,
  HelpCircle,
  Layers,
  ArrowRight,
  TrendingUp,
  Shield,
  Upload
} from 'lucide-react';

const LinkedInIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

const GitHubIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const Profile = () => {
  const { user, logout, updateUser } = useAuth();

  // API stats state
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    name: user?.name || '',
    collegeName: user?.collegeName || '',
    department: user?.department || '',
    yearOfStudy: user?.yearOfStudy || '',
    registerNumber: user?.registerNumber || '',
    phoneNumber: user?.phoneNumber || '',
    linkedin: user?.linkedin || '',
    github: user?.github || '',
    portfolio: user?.portfolio || '',
    bio: user?.bio || ''
  });

  // Sync state with user context updates
  useEffect(() => {
    if (user) {
      setPersonalInfo({
        name: user.name || '',
        collegeName: user.collegeName || '',
        department: user.department || '',
        yearOfStudy: user.yearOfStudy || '',
        registerNumber: user.registerNumber || '',
        phoneNumber: user.phoneNumber || '',
        linkedin: user.linkedin || '',
        github: user.github || '',
        portfolio: user.portfolio || '',
        bio: user.bio || ''
      });
    }
  }, [user]);

  // Password fields state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Modal open states
  const [isCroppingModalOpen, setIsCroppingModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Cropper states
  const [imageSrc, setImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const cropperContainerRef = useRef(null);

  // Fetch academic stats
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await API.get('/auth/profile/stats');
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch profile stats:', err);
      toast.error('Could not load academic statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Update profile details handler
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!personalInfo.name.trim()) {
      toast.error('Full Name is required');
      return;
    }

    try {
      setIsSubmittingProfile(true);
      const res = await API.put('/auth/profile', personalInfo);
      if (res.data.success) {
        updateUser(res.data.user);
        setIsEditing(false);
        toast.success('Personal information updated successfully!');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Change password handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (user?.provider === 'local' && !passwords.currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await API.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      if (res.data.success) {
        toast.success('Password updated successfully!');
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error("Please type 'DELETE' exactly to confirm");
      return;
    }

    try {
      setIsDeletingAccount(true);
      const res = await API.delete('/auth/account');
      if (res.data.success) {
        toast.success('Your account has been deleted. Goodbye!');
        logout();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete account.');
    } finally {
      setIsDeletingAccount(false);
      setIsDeleteModalOpen(false);
    }
  };

  // Cropper logic
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  // Dragging event handlers
  const handleMouseDown = (e) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (!imageSrc) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  // Render cropped canvas and upload
  const handleCropAndUpload = () => {
    if (!imageSrc) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 300, 300);

      const containerWidth = 300;
      const containerHeight = 300;

      let renderWidth = containerWidth;
      let renderHeight = containerHeight;
      const imgRatio = img.width / img.height;

      if (imgRatio > 1) {
        renderWidth = containerHeight * imgRatio;
      } else {
        renderHeight = containerWidth / imgRatio;
      }

      renderWidth *= zoom;
      renderHeight *= zoom;

      const dx = (containerWidth - renderWidth) / 2 + offset.x;
      const dy = (containerHeight - renderHeight) / 2 + offset.y;

      ctx.drawImage(img, dx, dy, renderWidth, renderHeight);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            toast.error('Failed to crop image.');
            return;
          }

          const formData = new FormData();
          formData.append('photo', blob, 'avatar.jpg');

          try {
            setIsUploadingPhoto(true);
            const res = await API.post('/auth/profile/photo', formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });
            if (res.data.success) {
              updateUser(res.data.user);
              toast.success('Profile photo updated successfully!');
              setIsCroppingModalOpen(false);
              setImageSrc(null);
              fetchStats(); // refresh stats details
            }
          } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to upload photo.');
          } finally {
            setIsUploadingPhoto(false);
          }
        },
        'image/jpeg',
        0.9
      );
    };
  };

  // Format Join Date
  const formatJoinDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <SEO title="User Profile Center" description="Manage personal settings, edit college credentials, trace learning streaks, and review academic statistics in MyCampusOS." />

      {/* HEADER SECTION */}
      <div className="bg-[#0a0f1d]/60 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-indigo-600/5 blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-violet-600/5 blur-[80px] pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-center gap-6 z-10 relative">
          {/* Avatar Container */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-indigo-500/30 bg-slate-900 flex items-center justify-center shadow-lg relative">
              {user?.profileImage || user?.avatar ? (
                <img
                  src={user.profileImage || user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-slate-500" />
              )}
            </div>
            <button
              onClick={() => setIsCroppingModalOpen(true)}
              className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-md transition-all cursor-pointer active:scale-95 group-hover:scale-105"
              title="Change profile picture"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* User Details */}
          <div className="flex-1 text-center md:text-left space-y-2.5 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-heading font-black text-white truncate">{user?.name}</h1>
              <span className="inline-flex self-center md:self-auto px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 text-xs font-semibold uppercase tracking-wider">
                Student
              </span>
            </div>
            <p className="text-slate-400 text-sm flex items-center justify-center md:justify-start gap-1.5 truncate">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <span>{user?.email}</span>
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Joined {formatJoinDate(user?.joinedAt || user?.createdAt)}
              </span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Account: <span className="capitalize text-indigo-400 font-semibold">{user?.provider || 'local'}</span>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 shrink-0">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1e293b]/60 hover:bg-[#1e293b] border border-slate-750 hover:border-slate-650 text-slate-200 text-sm font-medium rounded-xl cursor-pointer transition-all active:scale-[0.98]"
              >
                Edit Profile
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium rounded-xl cursor-pointer transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* THREE COLUMN GRID FOR BODY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (CAMPUSBUDDY INSIGHTS & ACCOUNT SETTINGS) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* CAMPUSBUDDY INSIGHTS */}
          <div className="bg-[#0a0f1d]/60 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800/40">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-heading font-bold text-white">CampusBuddy Insights</h2>
            </div>

            {loadingStats ? (
              <div className="space-y-4 py-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-3 w-20 bg-slate-800 animate-pulse rounded-md"></div>
                    <div className="h-3.5 w-24 bg-slate-800 animate-pulse rounded-md"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Productivity Score Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-slate-500" />
                      Productivity Score
                    </span>
                    <span className="text-indigo-400 font-bold">{stats?.insights?.productivityScore || 100}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden border border-slate-750">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats?.insights?.productivityScore || 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Streak card */}
                <div className="flex items-center justify-between p-3.5 bg-[#131c31]/30 border border-slate-800/50 rounded-2xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <Flame className="w-5 h-5 text-amber-500 shrink-0" />
                    <span className="text-slate-350 text-xs font-medium truncate">Current Streak</span>
                  </div>
                  <span className="text-sm font-black text-amber-500 shrink-0">{stats?.insights?.currentStreak || 0} Days</span>
                </div>

                {/* Features & Focus Area */}
                <div className="space-y-3 pt-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Most Used Tool:</span>
                    <span className="text-slate-300 font-semibold px-2.5 py-0.5 rounded-full bg-[#1b263b]/50 border border-slate-750">{stats?.insights?.mostUsedFeature || 'None yet'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Learning Focus Area:</span>
                    <span className="text-slate-350 font-bold max-w-[150px] truncate" title={stats?.insights?.learningFocusArea}>{stats?.insights?.learningFocusArea || 'General'}</span>
                  </div>
                </div>

                {/* Next Action Box */}
                <div className="pt-3 border-t border-slate-800/40">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Recommended Next Action</span>
                  <div className="mt-2 p-3 bg-indigo-600/10 border border-indigo-500/10 rounded-2xl text-xs text-indigo-300 flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-indigo-400 shrink-0" />
                    <span className="font-semibold">{stats?.insights?.recommendedAction || 'Update daily tasks to build study habit streaks.'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACCOUNT SETTINGS */}
          <div className="bg-[#0a0f1d]/60 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800/40">
              <Lock className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-heading font-bold text-white">Account Settings</h2>
            </div>

            {/* Change password section */}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Change Password</h3>
              
              {user?.provider === 'google' && (
                <p className="text-[10px] text-slate-500 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                  You logged in with Google OAuth. You can set a password here to enable standard email/password logins in the future.
                </p>
              )}

              {user?.provider === 'local' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    className="w-full bg-[#131b2e]/40 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">New Password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  className="w-full bg-[#131b2e]/40 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  className="w-full bg-[#131b2e]/40 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isChangingPassword ? 'Saving Password...' : 'Save Password'}
              </button>
            </form>

            {/* Danger Zone (Account controls) */}
            <div className="pt-4 border-t border-slate-800/40 space-y-3">
              <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wide">Danger Zone</h3>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 text-red-400 text-xs font-semibold rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                >
                  Sign Out
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all active:scale-[0.98] shadow-md shadow-rose-600/10"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (PERSONAL INFORMATION & ACADEMIC OVERVIEW) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PERSONAL INFORMATION */}
          <div className="bg-[#0a0f1d]/60 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-heading font-bold text-white">Personal & College Information</h2>
              </div>
              {!isEditing && (
                <span className="text-xs text-slate-500">Click 'Edit Profile' above to modify details</span>
              )}
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Row 1: Name & College */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={personalInfo.name}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                      className="w-full bg-[#131b2e]/45 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">College Name</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={personalInfo.collegeName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, collegeName: e.target.value })}
                      className="w-full bg-[#131b2e]/45 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="e.g. Stanford University"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Department & Year of Study */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Department</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={personalInfo.department}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, department: e.target.value })}
                    className="w-full bg-[#131b2e]/45 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Year of Study</label>
                  <select
                    disabled={!isEditing}
                    value={personalInfo.yearOfStudy}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, yearOfStudy: e.target.value })}
                    className="w-full bg-[#131b2e]/45 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="" className="bg-[#0f172a]">Select Year</option>
                    <option value="1st Year" className="bg-[#0f172a]">1st Year</option>
                    <option value="2nd Year" className="bg-[#0f172a]">2nd Year</option>
                    <option value="3rd Year" className="bg-[#0f172a]">3rd Year</option>
                    <option value="4th Year" className="bg-[#0f172a]">4th Year</option>
                    <option value="Postgraduate" className="bg-[#0f172a]">Postgraduate</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Register Number & Phone Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Register Number</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={personalInfo.registerNumber}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, registerNumber: e.target.value })}
                    className="w-full bg-[#131b2e]/45 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="e.g. U19CS104"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-500 font-semibold">+91</span>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={personalInfo.phoneNumber}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, phoneNumber: e.target.value })}
                      className="w-full bg-[#131b2e]/45 border border-slate-800 rounded-xl py-2.5 pl-12 pr-4 text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                </div>
              </div>

              {/* Bio description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Short Bio</label>
                <textarea
                  disabled={!isEditing}
                  rows="3"
                  value={personalInfo.bio}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, bio: e.target.value })}
                  className="w-full bg-[#131b2e]/45 border border-slate-800 rounded-xl py-2 px-4 text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                  placeholder="Share a bit about yourself, your interests, research focus..."
                ></textarea>
              </div>

              {/* Row 4: URLs (LinkedIn, GitHub, Portfolio) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <LinkedInIcon className="w-3 h-3" />
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    disabled={!isEditing}
                    value={personalInfo.linkedin}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, linkedin: e.target.value })}
                    className="w-full bg-[#131b2e]/45 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <GitHubIcon className="w-3 h-3" />
                    GitHub URL
                  </label>
                  <input
                    type="url"
                    disabled={!isEditing}
                    value={personalInfo.github}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, github: e.target.value })}
                    className="w-full bg-[#131b2e]/45 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="https://github.com/username"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Portfolio URL
                  </label>
                  <input
                    type="url"
                    disabled={!isEditing}
                    value={personalInfo.portfolio}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, portfolio: e.target.value })}
                    className="w-full bg-[#131b2e]/45 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:border-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="https://portfolio.com"
                  />
                </div>
              </div>

              {/* Show save changes if editing */}
              {isEditing && (
                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={isSubmittingProfile}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-lg shadow-indigo-600/10 transition-all active:scale-[0.98]"
                  >
                    <Save className="w-4 h-4" />
                    {isSubmittingProfile ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* ACADEMIC OVERVIEW */}
          <div className="bg-[#0a0f1d]/60 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800/40">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-heading font-bold text-white">Academic Overview</h2>
            </div>

            {loadingStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-slate-900/30 border border-slate-800/40 p-4.5 rounded-2xl animate-pulse space-y-3">
                    <div className="h-3 w-20 bg-slate-800 rounded"></div>
                    <div className="h-6 w-10 bg-slate-800 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                
                {/* Tasks Completed */}
                <div className="bg-[#131c31]/20 border border-slate-800/60 p-4.5 rounded-2xl flex items-center gap-3.5 hover:border-slate-700/60 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/15 flex items-center justify-center text-green-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tasks Done</p>
                    <p className="text-lg font-black text-white">{stats?.academicOverview?.tasksCompleted || 0}</p>
                  </div>
                </div>

                {/* Goals Achieved */}
                <div className="bg-[#131c31]/20 border border-slate-800/60 p-4.5 rounded-2xl flex items-center gap-3.5 hover:border-slate-700/60 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Goals Won</p>
                    <p className="text-lg font-black text-white">{stats?.academicOverview?.goalsAchieved || 0}</p>
                  </div>
                </div>

                {/* Notes Uploaded */}
                <div className="bg-[#131c31]/20 border border-slate-800/60 p-4.5 rounded-2xl flex items-center gap-3.5 hover:border-slate-700/60 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Notes Vault</p>
                    <p className="text-lg font-black text-white">{stats?.academicOverview?.notesUploaded || 0}</p>
                  </div>
                </div>

                {/* Study Plans Created */}
                <div className="bg-[#131c31]/20 border border-slate-800/60 p-4.5 rounded-2xl flex items-center gap-3.5 hover:border-slate-700/60 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center text-purple-400 shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Study Plans</p>
                    <p className="text-lg font-black text-white">{stats?.academicOverview?.studyPlansCreated || 0}</p>
                  </div>
                </div>

                {/* Quizzes Taken */}
                <div className="bg-[#131c31]/20 border border-slate-800/60 p-4.5 rounded-2xl flex items-center gap-3.5 hover:border-slate-700/60 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center text-cyan-400 shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Quizzes Taken</p>
                    <p className="text-lg font-black text-white">{stats?.academicOverview?.quizzesTaken || 0}</p>
                  </div>
                </div>

                {/* Flashcards Created */}
                <div className="bg-[#131c31]/20 border border-slate-800/60 p-4.5 rounded-2xl flex items-center gap-3.5 hover:border-slate-700/60 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/15 flex items-center justify-center text-pink-400 shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Flashcard Decks</p>
                    <p className="text-lg font-black text-white">{stats?.academicOverview?.flashcardsCreated || 0}</p>
                  </div>
                </div>

                {/* AI Requests Used */}
                <div className="bg-[#131c31]/20 border border-slate-800/60 p-4.5 rounded-2xl flex items-center gap-3.5 hover:border-slate-700/60 transition-colors sm:col-span-2 md:col-span-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center text-violet-400 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI Operations Traced</p>
                    <p className="text-sm font-semibold text-slate-350">
                      You have utilized the CampusBuddy AI agent <span className="text-white font-black text-base px-1">{stats?.academicOverview?.aiRequestsUsed || 0}</span> times to assist study insights.
                    </p>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>

      {/* MODAL 1: CROPPER WIDGET */}
      {isCroppingModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                setIsCroppingModalOpen(false);
                setImageSrc(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-400" />
              Adjust Profile Picture
            </h2>

            {/* Select file input */}
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-850 hover:border-slate-700 rounded-2xl cursor-pointer bg-[#131b2e]/30 group transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors mb-2" />
                  <p className="text-xs text-slate-400 font-medium">Click to select photo</p>
                  <p className="text-[10px] text-slate-500 mt-1">PNG, JPG, JPEG (Max 5MB)</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>

            {/* Drag & Crop preview block */}
            {imageSrc && (
              <div className="space-y-4">
                <p className="text-[10px] text-slate-500 text-center">
                  Drag the photo to adjust crop placement. Use the slider below to zoom.
                </p>
                
                {/* Crop container */}
                <div
                  ref={cropperContainerRef}
                  className="w-[260px] h-[260px] mx-auto rounded-full overflow-hidden border-2 border-indigo-500/20 bg-slate-950 relative cursor-move touch-none select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                >
                  <img
                    src={imageSrc}
                    alt="Source"
                    className="absolute max-w-none pointer-events-none origin-center"
                    style={{
                      transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
                      top: '50%',
                      left: '50%',
                      transformOrigin: '0 0',
                      marginTop: `-${150}px`,
                      marginLeft: `-${150}px`,
                      width: '300px',
                      height: '300px',
                      objectFit: 'contain'
                    }}
                  />
                  {/* Central Circular Guideline */}
                  <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none"></div>
                </div>

                {/* Scale slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold">
                    <span>Zoom Scale</span>
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Confirm upload button */}
                <button
                  onClick={handleCropAndUpload}
                  disabled={isUploadingPhoto}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold text-xs rounded-xl shadow-lg cursor-pointer transition-all active:scale-[0.98]"
                >
                  {isUploadingPhoto ? 'Uploading Photo...' : 'Apply Photo Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: LOGOUT CONFIRMATION */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative">
            <h2 className="text-base font-heading font-black text-white flex items-center gap-2">
              <LogOut className="w-5 h-5 text-indigo-400" />
              Sign Out Confirmation
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to log out from MyCampusOS? You will need to log back in to access your dashboard.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2 bg-[#1e293b]/60 hover:bg-[#1e293b] text-slate-350 border border-slate-800 text-xs font-semibold rounded-xl cursor-pointer transition-all"
              >
                No, Stay
              </button>
              <button
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  logout();
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE ACCOUNT DOUBLE-CONFIRM */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-red-500/20 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmText('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-heading font-bold text-rose-500 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              CRITICAL: Account Deletion
            </h2>

            <div className="p-3 bg-red-500/10 border border-red-500/15 rounded-2xl text-xs text-red-400 leading-relaxed space-y-2">
              <p className="font-semibold">This action is permanent and irreversible!</p>
              <p>
                Deleting your account will immediately erase all tasks, academic goals, uploaded notes documents, timetable schedulers, and AI study data. There is no backup server.
              </p>
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Type <span className="text-white bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/25">DELETE</span> below to confirm:
              </label>
              <input
                type="text"
                placeholder="Type 'DELETE' exactly"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-[#131b2e]/50 border border-red-500/30 focus:border-red-500 rounded-xl py-2.5 px-4 text-slate-200 text-xs outline-none transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 py-2.5 bg-[#1e293b]/60 hover:bg-[#1e293b] text-slate-350 border border-slate-800 text-xs font-semibold rounded-xl cursor-pointer transition-all"
              >
                Keep Account
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || isDeletingAccount}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-500/20 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-lg"
              >
                {isDeletingAccount ? 'Deleting Account...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
