import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const OAuthSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { oauthLogin } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      oauthLogin(token);
      navigate('/', { replace: true });
    } else {
      toast.error('Authentication failed. No token received.');
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate, oauthLogin]);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#070b13] overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

      <div className="z-10 flex flex-col items-center">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
        </div>
        <h2 className="mt-6 text-xl font-semibold text-white">Completing Sign In</h2>
        <p className="mt-2 text-slate-400 text-sm animate-pulse">Setting up your secure session...</p>
      </div>
    </div>
  );
};

export default OAuthSuccess;
