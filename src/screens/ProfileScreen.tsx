import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { User, Shield, Flame, Trophy, Award, MapPin, Calendar, Clock, RefreshCcw, LogOut } from 'lucide-react';
import { UserProfile, Territory, RunRecord, Badge } from '../types';
import { storageService } from '../services/storageService';
import { formatArea, formatAreaAcres, formatDistance, formatDuration } from '../utils/geoEngine';

interface ProfileScreenProps {
  onSelectTerritory: (territoryId: string) => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onSelectTerritory,
  onLogout,
}) => {
  const [user, setUser] = useState<UserProfile>(storageService.getUserProfile());
  const [territories, setTerritories] = useState<Territory[]>(storageService.getTerritories());
  const [runs, setRuns] = useState<RunRecord[]>(storageService.getRuns());
  const [badges, setBadges] = useState<Badge[]>(storageService.getBadges());
  const [activeTab, setActiveTab] = useState<'territories' | 'runs' | 'badges'>('territories');

  useEffect(() => {
    setUser(storageService.getUserProfile());
    setTerritories(storageService.getTerritories());
    setRuns(storageService.getRuns());
    setBadges(storageService.getBadges());
  }, []);

  const handleResetData = () => {
    if (window.confirm('Reset all territory, run, and local profile stats to fresh defaults?')) {
      storageService.resetAllData();
      setUser(storageService.getUserProfile());
      setTerritories(storageService.getTerritories());
      setRuns(storageService.getRuns());
      setBadges(storageService.getBadges());
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#050505] text-[#F5F5F5] flex flex-col justify-between pb-24 overflow-y-auto">
      <div className="p-6 sm:p-8 pt-6">
        {/* Profile Card */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FF5F1F] flex items-center justify-center text-2xl font-black text-white italic shadow-[0_0_25px_rgba(255,95,31,0.4)] border border-white/20">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight uppercase italic text-white">
                {user.name}
              </h1>
              <p className="text-xs text-gray-500 font-mono">{user.email}</p>
              <span className="inline-block text-[10px] font-mono font-bold text-[#FF5F1F] bg-[#1A1A1A] border border-[#333333] px-2.5 py-0.5 rounded-full mt-1 uppercase">
                Territory Conqueror
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-2.5 rounded-xl bg-[#1A1A1A] border border-[#333333] hover:bg-[#222222] text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Major Stats Overview Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-[#222222]">
            <span className="text-[10px] uppercase font-mono text-gray-500 flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#FF5F1F]" />
              Territory
            </span>
            <div className="text-xl font-bold font-mono text-[#FF5F1F] mt-1">
              {formatArea(user.totalTerritoryMeters)}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">
              {formatAreaAcres(user.totalTerritoryMeters)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-[#222222]">
            <span className="text-[10px] uppercase font-mono text-gray-500 flex items-center gap-1">
              <Flame className="w-3 h-3 text-[#FF5F1F]" />
              Total Distance
            </span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {formatDistance(user.totalDistanceMeters)}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Cumulative GPS</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-[#222222]">
            <span className="text-[10px] uppercase font-mono text-gray-500 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-[#FF5F1F]" />
              Runs
            </span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {user.totalRuns}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Sessions</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-[#222222]">
            <span className="text-[10px] uppercase font-mono text-gray-500 flex items-center gap-1">
              <Award className="w-3 h-3 text-[#FF5F1F]" />
              Best Run
            </span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {formatDistance(user.bestRunMeters)}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Longest loop</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-[#222222] mb-4">
          <button
            onClick={() => setActiveTab('territories')}
            className={`pb-2.5 px-4 text-xs font-mono font-bold transition-all relative uppercase tracking-wider cursor-pointer ${
              activeTab === 'territories'
                ? 'text-[#FF5F1F]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Claimed Sectors ({territories.length})
            {activeTab === 'territories' && (
              <motion.div
                layoutId="profileTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5F1F]"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('runs')}
            className={`pb-2.5 px-4 text-xs font-mono font-bold transition-all relative uppercase tracking-wider cursor-pointer ${
              activeTab === 'runs'
                ? 'text-[#FF5F1F]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Run History ({runs.length})
            {activeTab === 'runs' && (
              <motion.div
                layoutId="profileTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5F1F]"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`pb-2.5 px-4 text-xs font-mono font-bold transition-all relative uppercase tracking-wider cursor-pointer ${
              activeTab === 'badges'
                ? 'text-[#FF5F1F]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Badges ({badges.filter((b) => b.unlockedAt).length}/{badges.length})
            {activeTab === 'badges' && (
              <motion.div
                layoutId="profileTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5F1F]"
              />
            )}
          </button>
        </div>

        {/* Tab 1: Territories List */}
        {activeTab === 'territories' && (
          <div className="space-y-2.5">
            {territories.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#0F0F0F] border border-[#222222] text-center">
                <Shield className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400 font-medium">No territories claimed yet.</p>
                <p className="text-[11px] text-gray-500 font-mono mt-1">
                  Complete a closed-loop run on the map to capture sovereign territory.
                </p>
              </div>
            ) : (
              territories.map((territory) => (
                <div
                  key={territory.territoryId}
                  onClick={() => onSelectTerritory(territory.territoryId)}
                  className="p-4 rounded-2xl bg-[#0F0F0F] border border-[#222222] hover:border-[#333333] flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-4 h-4 rounded-md shadow-sm shrink-0"
                      style={{ backgroundColor: territory.color || '#FF5F1F' }}
                    />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight">{territory.name}</h4>
                      <div className="text-[11px] text-gray-500 font-mono flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-600" />
                          {new Date(territory.createdAt).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>{territory.points.length} GPS Vertices</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold font-mono text-[#FF5F1F]">
                      {formatArea(territory.areaMeters)}
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {territory.areaAcres.toFixed(2)} ac
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Run History */}
        {activeTab === 'runs' && (
          <div className="space-y-2.5">
            {runs.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#0F0F0F] border border-[#222222] text-center">
                <Flame className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400 font-medium">No recorded runs yet.</p>
              </div>
            ) : (
              runs.map((run) => (
                <div
                  key={run.runId}
                  className="p-4 rounded-2xl bg-[#0F0F0F] border border-[#222222] flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-white font-mono">
                        {formatDistance(run.distanceMeters)}
                      </h4>
                      {run.territoryCaptured && (
                        <span className="text-[9px] font-mono font-bold text-[#FF5F1F] bg-[#1A1A1A] border border-[#333333] px-1.5 py-0.5 rounded">
                          CAPTURED
                        </span>
                      )}
                      {run.isDemoRun && (
                        <span className="text-[9px] font-mono font-bold text-amber-400 bg-[#1A1A1A] border border-[#333333] px-1.5 py-0.5 rounded">
                          DEMO
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-600" />
                        {formatDuration(run.durationSeconds)}
                      </span>
                      <span>•</span>
                      <span>{new Date(run.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-gray-300">
                      {(run.averageSpeedKmh || 0).toFixed(1)} km/h
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase font-mono">Avg Speed</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Badges */}
        {activeTab === 'badges' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {badges.map((badge) => {
              const isUnlocked = !!badge.unlockedAt;
              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
                    isUnlocked
                      ? 'bg-[#0F0F0F] border-[#FF5F1F]/40 shadow-[0_0_15px_rgba(255,95,31,0.1)]'
                      : 'bg-[#0F0F0F]/50 border-[#222222] opacity-40'
                  }`}
                >
                  <div className="text-2xl w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center border border-[#333333]">
                    {badge.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-tight">{badge.name}</h4>
                      {isUnlocked && (
                        <span className="text-[8px] font-mono font-bold text-white bg-[#FF5F1F] px-1.5 py-0.5 rounded">
                          UNLOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">{badge.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dev / Hackathon Utilities */}
        <div className="mt-8 pt-6 border-t border-[#222222] flex justify-center">
          <button
            onClick={handleResetData}
            className="text-xs text-gray-600 hover:text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer font-mono"
          >
            <RefreshCcw className="w-3 h-3" />
            <span>Reset Demo & Local Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
