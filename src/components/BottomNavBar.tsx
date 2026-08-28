import React from 'react';
import { Home, Map, Trophy, User, Play } from 'lucide-react';
import { AppScreen } from '../types';

interface BottomNavBarProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  isRunning: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentScreen,
  onNavigate,
  isRunning,
}) => {
  // Only show on main app screens
  if (currentScreen === 'SPLASH' || currentScreen === 'LOGIN' || currentScreen === 'SIGNUP') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-[#222222] px-4 py-2 flex items-center justify-around max-w-lg mx-auto select-none">
      {/* Home */}
      <button
        id="nav-btn-home"
        onClick={() => onNavigate('HOME')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          currentScreen === 'HOME'
            ? 'text-[#FF5F1F] font-bold scale-105'
            : 'text-gray-500 hover:text-gray-300 font-medium'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] tracking-wide font-mono uppercase">Home</span>
      </button>

      {/* Map / Run (Primary Center Action) */}
      <button
        id="nav-btn-map"
        onClick={() => onNavigate('MAP_RUN')}
        className={`relative flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all cursor-pointer ${
          currentScreen === 'MAP_RUN'
            ? 'text-white font-extrabold scale-105'
            : 'text-gray-400 hover:text-white font-semibold'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            isRunning
              ? 'bg-[#FF5F1F] text-white shadow-[0_0_15px_rgba(255,95,31,0.6)] animate-pulse'
              : currentScreen === 'MAP_RUN'
              ? 'bg-[#FF5F1F] text-white shadow-[0_0_15px_rgba(255,95,31,0.4)]'
              : 'bg-[#1A1A1A] border border-[#333333] text-gray-300'
          }`}
        >
          {isRunning ? (
            <Play className="w-4 h-4 fill-white text-white ml-0.5" />
          ) : (
            <Map className="w-4 h-4" />
          )}
        </div>
        <span className="text-[10px] tracking-wide mt-0.5 font-mono uppercase">
          {isRunning ? 'Active' : 'Map'}
        </span>
      </button>

      {/* Leaderboard */}
      <button
        id="nav-btn-leaderboard"
        onClick={() => onNavigate('LEADERBOARD')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          currentScreen === 'LEADERBOARD'
            ? 'text-[#FF5F1F] font-bold scale-105'
            : 'text-gray-500 hover:text-gray-300 font-medium'
        }`}
      >
        <Trophy className="w-5 h-5" />
        <span className="text-[10px] tracking-wide font-mono uppercase">Ranks</span>
      </button>

      {/* Profile */}
      <button
        id="nav-btn-profile"
        onClick={() => onNavigate('PROFILE')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          currentScreen === 'PROFILE'
            ? 'text-[#FF5F1F] font-bold scale-105'
            : 'text-gray-500 hover:text-gray-300 font-medium'
        }`}
      >
        <User className="w-5 h-5" />
        <span className="text-[10px] tracking-wide font-mono uppercase">Profile</span>
      </button>
    </div>
  );
};
