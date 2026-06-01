import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, GraduationCap } from 'lucide-react';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    const result = await login(data.email, data.password);
    setIsSubmitting(false);
    
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen-dvh bg-[#070b13] overflow-hidden px-4">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* Logo/Brand Header */}
        <div className="flex flex-col items-center mb-8">
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
          <h2 className="text-xl font-heading font-semibold text-white mb-6">
            Sign In to your account
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
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
                  } rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:ring-4`}
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
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
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  className={`w-full bg-[#131b2e]/60 border ${
                    errors.password ? 'border-red-500/80 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  } rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:ring-4`}
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs font-medium text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="relative w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Registration Redirect Link */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors duration-150"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
