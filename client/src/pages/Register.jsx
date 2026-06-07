import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, UserPlus, GraduationCap, Check, X } from 'lucide-react';

const Register = () => {
  const { register: signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Watch password field to check match with confirmPassword
  const password = watch('password') || '';

  const getStrength = (pwd) => {
    if (!pwd) return { label: '', colorClass: '', barWidth: '0%', barColor: '' };
    
    let score = 0;
    const checks = {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd)
    };
    
    if (checks.length) score++;
    if (checks.upper) score++;
    if (checks.lower) score++;
    if (checks.number) score++;
    if (checks.special) score++;
    
    const allMet = score === 5;
    
    if (allMet && pwd.length >= 14) {
      return { label: 'Very Strong', colorClass: 'text-green-400', barWidth: '100%', barColor: 'bg-green-500' };
    } else if (allMet) {
      return { label: 'Strong', colorClass: 'text-yellow-400', barWidth: '75%', barColor: 'bg-yellow-400' };
    } else if (score >= 4) {
      return { label: 'Medium', colorClass: 'text-orange-400', barWidth: '50%', barColor: 'bg-orange-500' };
    } else {
      return { label: 'Weak', colorClass: 'text-red-400', barWidth: '25%', barColor: 'bg-red-500' };
    }
  };

  const criteria = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) }
  ];

  const strength = getStrength(password);
  const allMet = criteria.every(c => c.met);

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    const result = await signup(data.name, data.email, data.password);
    setIsSubmitting(false);
    
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen-dvh bg-[#070b13] overflow-hidden px-4 py-12">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* Logo/Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20 mb-3 animate-pulse">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-white">
            MyCampus<span className="text-indigo-400">OS</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Your Complete Campus Companion</p>
        </div>

        {/* Card Panel */}
        <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-heading font-semibold text-white mb-5">
            Create your student account
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="John Doe"
                  {...register('name', {
                    required: 'Name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                  className={`w-full bg-[#131b2e]/60 border ${
                    errors.name ? 'border-red-500/80 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  } rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:ring-4`}
                />
              </div>
              {errors.name && (
                <p className="mt-1.5 text-xs font-medium text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  placeholder="student@university.edu"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  className={`w-full bg-[#131b2e]/60 border ${
                    errors.email ? 'border-red-500/80 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  } rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:ring-4`}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs font-medium text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  })}
                  className={`w-full bg-[#131b2e]/60 border ${
                    errors.password ? 'border-red-500/80 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  } rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:ring-4`}
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs font-medium text-red-400">
                  {errors.password.message}
                </p>
              )}

              {/* Real-time Password Strength and Checklist */}
              {password && (
                <div className="mt-3.5 space-y-2.5 p-3.5 bg-slate-950/40 border border-slate-900 rounded-2xl transition-all duration-300">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-medium">Password Strength:</span>
                    <span className={`font-bold uppercase tracking-wider text-[10px] transition-colors duration-200 ${strength.colorClass}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${strength.barColor}`} 
                      style={{ width: strength.barWidth }}
                    />
                  </div>
                  
                  {/* Criteria Checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-900/60">
                    {criteria.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`transition-all duration-200 p-0.5 rounded-full ${
                          c.met ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {c.met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        </span>
                        <span className={`transition-all duration-200 ${
                          c.met ? 'text-slate-300 line-through decoration-slate-700/40' : 'text-slate-400'
                        }`}>
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === password || 'Passwords do not match',
                  })}
                  className={`w-full bg-[#131b2e]/60 border ${
                    errors.confirmPassword ? 'border-red-500/80 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  } rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:ring-4`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs font-medium text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={isSubmitting || !allMet}
              className="relative w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed group mt-3"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  <span>Register</span>
                </>
              )}
            </button>
          </form>

          {/* Google Sign Up Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <span className="relative px-3 bg-[#0f172a]/60 backdrop-blur-xl text-xs font-semibold uppercase tracking-wider text-slate-500">
              Or
            </span>
          </div>

          {/* Google Register Button */}
          <button
            type="button"
            onClick={() => {
              window.location.href = 'http://localhost:5000/api/auth/google';
            }}
            className="w-full flex items-center justify-center gap-3 bg-[#1e293b]/50 hover:bg-[#1e293b] border border-slate-850 hover:border-slate-700 text-slate-200 font-medium py-3 px-4 rounded-xl cursor-pointer transition-all duration-200 active:scale-[0.98] group"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Login Redirect Link */}
          <div className="mt-5 text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors duration-150"
              >
                Sign In here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
