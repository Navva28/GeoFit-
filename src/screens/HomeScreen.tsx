import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Play, MapPin, Flame, TrendingUp, Trophy, Compass, Shield, ChevronRight, Sparkles, Navigation } from 'lucide-react';
import { UserProfile, Territory, RunRecord } from '../types';
import { storageService } from '../services/storageService';
import { formatArea, formatAreaAcres, formatDistance } from '../utils/geoEngine';

interface HomeScreenProps {
  onStartRun: () => void;
  onOpenMap: () => void;
  onOpenLeaderboard: () => void;
  onOpenProfile: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartRun,
  onOpenMap,
  onOpenLeaderboard,
  onOpenProfile,
}) => {
  const [user, setUser] = useState<UserProfile>(storageService.getUserProfile());
  const [territories, setTerritories] = useState<Territory[]>(storageService.getTerritories());
  const [runs, setRuns] = useState<RunRecord[]>(storageService.getRuns());

  useEffect(() => {
    setUser(storageService.getUserProfile());
    setTerritories(storageService.getTerritories());
    setRuns(storageService.getRuns());
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#050505] text-[#F5F5F5] flex flex-col justify-between pb-24 overflow-y-auto">
      {/* Top Header Bar */}
      <div className="p-6 sm:p-8 pt-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#FF5F1F] rounded-lg flex items-center justify-center font-black text-white italic text-lg shadow-[0_0_15px_rgba(255,95,31,0.4)]">
              G
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase italic text-white leading-tight">
                GEOFIT
              </h1>
              <p className="text-[11px] text-gray-500 font-mono">
                {getGreeting()}, <span className="text-gray-300 font-medium">{user.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-mono uppercase">Rank</p>
              <p className="text-xs font-bold text-[#FF5F1F] font-mono">#04</p>
            </div>
            <button
              onClick={onOpenProfile}
              className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#333333] hover:border-[#FF5F1F] flex items-center justify-center text-xs font-bold text-gray-200 transition-all cursor-pointer"
            >
              {user.name.slice(0, 2).toUpperCase()}
            </button>
          </div>
        </div>

        {/* Hero Dominant Metric: TOTAL TERRITORY */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-[#0F0F0F] border border-[#222222] p-6 shadow-2xl mb-4"
        >
          {/* Subtle grid background mesh */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#333333 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 uppercase font-mono flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#FF5F1F]" />
                Total Territory
              </p>
              <span className="text-[10px] font-mono font-bold text-[#FF5F1F] bg-[#1A1A1A] border border-[#333333] px-2.5 py-0.5 rounded-full">
                {formatAreaAcres(user.totalTerritoryMeters)}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                {formatArea(user.totalTerritoryMeters)}
              </h2>
            </div>

            <div className="mt-4 pt-4 border-t border-[#222222] flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-mono">Weekly Distance</p>
                <p className="font-bold text-white font-mono text-sm sm:text-base">
                  {formatDistance(user.totalDistanceMeters)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase font-mono">Captured Sectors</p>
                <p className="font-bold text-white font-mono text-sm sm:text-base">
                  {territories.length}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Secondary Telemetry Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-4 rounded-2xl bg-[#121212] border border-[#222222] flex items-center gap-3.5">
            <div className="w-10 h-10 bg-[#FF5F1F]/10 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-[#FF5F1F]" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-mono">Distance</p>
              <p className="text-lg font-bold font-mono text-white">
                {formatDistance(user.totalDistanceMeters)}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#121212] border border-[#222222] flex items-center gap-3.5">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center shrink-0 border border-[#333333]">
              <Flame className="w-5 h-5 text-[#FF5F1F]" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-mono">Sessions</p>
              <p className="text-lg font-bold font-mono text-white">
                {user.totalRuns}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action: START RUN BUTTON (Elegant Blaze Orange Pill) */}
        <motion.button
          id="btn-home-start-run"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartRun}
          className="w-full h-15 rounded-full bg-[#FF5F1F] text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(255,95,31,0.4)] hover:shadow-[0_0_30px_rgba(255,95,31,0.6)] transition-all cursor-pointer mb-6"
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
          </div>
          <span>START RUN & CAPTURE</span>
        </motion.button>

        {/* Claimed Sectors / Territory Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#FF5F1F]" />
              Claimed Sectors ({territories.length})
            </h3>
            <button
              onClick={onOpenMap}
              className="text-xs font-mono font-bold text-[#FF5F1F] hover:text-[#ff7842] flex items-center gap-1 cursor-pointer uppercase tracking-wider"
            >
              <span>View Map</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {territories.length === 0 ? (
            <div
              onClick={onOpenMap}
              className="p-5 rounded-2xl bg-[#0F0F0F] border border-[#222222] text-center flex flex-col items-center gap-2 cursor-pointer hover:border-[#333333] transition-colors"
            >
              <Compass className="w-7 h-7 text-gray-600 animate-spin" style={{ animationDuration: '12s' }} />
              <p className="text-xs font-medium text-gray-400">
                The map is unclaimed around you.
              </p>
              <span className="text-[11px] text-[#FF5F1F] font-mono font-bold uppercase tracking-wider">
                Explore GPS Grid →
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {territories.slice(0, 3).map((territory) => (
                <div
                  key={territory.territoryId}
                  onClick={onOpenMap}
                  className="p-3.5 rounded-xl bg-[#0F0F0F] border border-[#222222] hover:border-[#333333] flex items-center justify-between transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-md shadow-sm"
                      style={{ backgroundColor: territory.color || '#FF5F1F' }}
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-tight">{territory.name}</h4>
                      <span className="text-[10px] text-gray-500 font-mono">
                        Captured {new Date(territory.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-[#FF5F1F]">
                      {formatArea(territory.areaMeters)}
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {territory.areaAcres.toFixed(2)} ac
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
