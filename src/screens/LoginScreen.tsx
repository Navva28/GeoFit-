import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Mail, Lock, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { storageService } from '../services/storageService';

interface LoginScreenProps {
  onSuccess: () => void;
  onNavigateToSignUp: () => void;
  onInstantDemoMode: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccess,
  onNavigateToSignUp,
  onInstantDemoMode,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      // Authenticate / load existing profile or assign local session
      const user = storageService.getUserProfile();
      if (email.trim() && user.email !== email) {
        storageService.updateUserProfile({ email: email.trim() });
      }
      setLoading(false);
      onSuccess();
    }, 600);
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-[#050505] flex flex-col justify-between p-6 sm:p-8 text-[#F5F5F5] overflow-y-auto">
      {/* Top Header */}
      <div className="w-full pt-6 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FF5F1F] flex items-center justify-center shadow-[0_0_25px_rgba(255,95,31,0.4)] mb-4 border border-white/20">
          <MapPin className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-3xl font-black uppercase italic tracking-tight text-white">
          GEO<span className="text-[#FF5F1F]">FIT</span>
        </h2>
        <p className="text-xs text-gray-500 font-mono mt-1 uppercase tracking-wider">
          Sign in to your territory command center
        </p>
      </div>

      {/* Main Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm mx-auto my-auto py-6"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                id="input-login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="runner@geofit.io"
                className="w-full bg-[#0F0F0F] border border-[#222222] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5F1F] font-mono transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                id="input-login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0F0F0F] border border-[#222222] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5F1F] font-mono transition-colors"
              />
            </div>
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-full bg-[#FF5F1F] hover:bg-[#ff7842] text-white font-bold uppercase tracking-widest text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,95,31,0.4)] transition-all active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast-Track Bypass Button */}
        <div className="mt-5 pt-4 border-t border-[#222222] text-center">
          <button
            id="btn-quick-demo"
            onClick={onInstantDemoMode}
            type="button"
            className="w-full py-2.5 px-4 rounded-full bg-[#1A1A1A] hover:bg-[#222222] border border-[#333333] text-gray-300 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF5F1F]" />
            <span>Fast-Track Demo Mode (Instant Access)</span>
          </button>
        </div>
      </motion.div>

      {/* Footer Nav */}
      <div className="w-full text-center pb-4 text-xs text-gray-500 font-mono">
        Don't have an account?{' '}
        <button
          id="btn-nav-signup"
          onClick={onNavigateToSignUp}
          className="text-[#FF5F1F] font-bold hover:underline cursor-pointer ml-1 uppercase"
        >
          Create Account
        </button>
      </div>
    </div>
  );
};
