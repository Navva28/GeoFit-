import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, User, Mail, Lock, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { storageService } from '../services/storageService';

interface SignUpScreenProps {
  onSuccess: () => void;
  onNavigateToLogin: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onSuccess,
  onNavigateToLogin,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your athlete name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      storageService.updateUserProfile({
        name: name.trim(),
        email: email.trim(),
      });
      setLoading(false);
      onSuccess();
    }, 600);
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-[#050505] flex flex-col justify-between p-6 sm:p-8 text-[#F5F5F5] overflow-y-auto">
      {/* Top Header */}
      <div className="w-full pt-2">
        <button
          id="btn-signup-back"
          onClick={onNavigateToLogin}
          className="p-2 -ml-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1A1A1A] transition-colors flex items-center gap-1.5 text-xs font-mono uppercase cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          <div className="w-12 h-12 rounded-2xl bg-[#FF5F1F] flex items-center justify-center shadow-[0_0_25px_rgba(255,95,31,0.4)] mb-3 border border-white/20">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">
            Create Athlete Account
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-1 uppercase tracking-wider">
            Join the global territory capture grid
          </p>
        </div>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm mx-auto my-auto py-4"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 mb-1 uppercase tracking-wider">
              Athlete Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                id="input-signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full bg-[#0F0F0F] border border-[#222222] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5F1F] font-mono transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 mb-1 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                id="input-signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full bg-[#0F0F0F] border border-[#222222] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5F1F] font-mono transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 mb-1 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                id="input-signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-[#0F0F0F] border border-[#222222] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5F1F] font-mono transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-400 mb-1 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                id="input-signup-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-[#0F0F0F] border border-[#222222] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5F1F] font-mono transition-colors"
              />
            </div>
          </div>

          <button
            id="btn-signup-submit"
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 rounded-full bg-[#FF5F1F] hover:bg-[#ff7842] text-white font-bold uppercase tracking-widest text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,95,31,0.4)] transition-all active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Create Account & Enter Grid</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Footer */}
      <div className="w-full text-center pb-4 text-xs text-gray-500 font-mono">
        Already registered?{' '}
        <button
          onClick={onNavigateToLogin}
          className="text-[#FF5F1F] font-bold hover:underline cursor-pointer ml-1 uppercase"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};
