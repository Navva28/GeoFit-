import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Shield, Flame, Medal, Crown, TrendingUp, Sparkles } from 'lucide-react';
import { LeaderboardEntry } from '../types';
import { storageService } from '../services/storageService';
import { formatArea, formatDistance } from '../utils/geoEngine';

export const LeaderboardScreen: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setLeaderboard(storageService.getLeaderboard());
  }, []);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-[#FF5F1F] fill-[#FF5F1F]" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300 fill-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-700 fill-amber-700" />;
    return <span className="font-mono font-bold text-gray-500 text-xs">#{rank.toString().padStart(2, '0')}</span>;
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#050505] text-[#F5F5F5] flex flex-col justify-between pb-24 overflow-y-auto">
      <div className="p-6 sm:p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FF5F1F] rounded-lg flex items-center justify-center font-black text-white italic text-base shadow-[0_0_15px_rgba(255,95,31,0.4)]">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase italic text-white leading-tight">
                LEADERBOARD
              </h1>
              <p className="text-[11px] text-gray-500 font-mono">
                GLOBAL TERRITORY RANKINGS
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#FF5F1F] bg-[#1A1A1A] border border-[#333333] px-2.5 py-1 rounded-full uppercase">
            Sovereigns
          </span>
        </div>

        <p className="text-xs text-gray-400 mb-6 font-mono">
          Athletes ranked by total square meters claimed through verified loops.
        </p>

        {/* Podium Top 3 Cards */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-2.5 mb-6 items-end">
            {/* Rank 2 */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-3 rounded-2xl bg-[#0F0F0F] border border-[#222222] text-center flex flex-col items-center"
            >
              <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#333333] text-gray-300 flex items-center justify-center text-xs font-mono font-bold mb-2">
                2
              </div>
              <h4 className="text-xs font-bold text-white truncate w-full uppercase tracking-tight">{leaderboard[1].name}</h4>
              <div className="text-xs font-bold font-mono text-[#FF5F1F] mt-1">
                {formatArea(leaderboard[1].totalTerritoryMeters)}
              </div>
              <span className="text-[9px] text-gray-500 font-mono">{formatDistance(leaderboard[1].totalDistanceMeters)}</span>
            </motion.div>

            {/* Rank 1 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 rounded-2xl bg-[#121212] border border-[#FF5F1F]/60 text-center flex flex-col items-center -translate-y-2 shadow-[0_0_25px_rgba(255,95,31,0.2)]"
            >
              <Crown className="w-7 h-7 text-[#FF5F1F] fill-[#FF5F1F] mb-1" />
              <h4 className="text-xs font-bold text-white truncate w-full uppercase tracking-tight">{leaderboard[0].name}</h4>
              <div className="text-sm font-bold font-mono text-[#FF5F1F] mt-1">
                {formatArea(leaderboard[0].totalTerritoryMeters)}
              </div>
              <span className="text-[10px] text-gray-400 font-mono">{formatDistance(leaderboard[0].totalDistanceMeters)}</span>
            </motion.div>

            {/* Rank 3 */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-3 rounded-2xl bg-[#0F0F0F] border border-[#222222] text-center flex flex-col items-center"
            >
              <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#333333] text-amber-500 flex items-center justify-center text-xs font-mono font-bold mb-2">
                3
              </div>
              <h4 className="text-xs font-bold text-white truncate w-full uppercase tracking-tight">{leaderboard[2].name}</h4>
              <div className="text-xs font-bold font-mono text-[#FF5F1F] mt-1">
                {formatArea(leaderboard[2].totalTerritoryMeters)}
              </div>
              <span className="text-[9px] text-gray-500 font-mono">{formatDistance(leaderboard[2].totalDistanceMeters)}</span>
            </motion.div>
          </div>
        )}

        {/* Full Ranking Table List */}
        <div className="space-y-2.5">
          {leaderboard.map((entry) => (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-4 rounded-2xl flex items-center justify-between transition-all ${
                entry.isCurrentUser
                  ? 'bg-[#121212] border-2 border-[#FF5F1F] shadow-[0_0_20px_rgba(255,95,31,0.2)]'
                  : 'bg-[#0F0F0F] border border-[#222222]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-7 flex items-center justify-center">
                  {getRankBadge(entry.rank)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight">{entry.name}</h3>
                    {entry.isCurrentUser && (
                      <span className="text-[9px] font-mono font-bold text-white bg-[#FF5F1F] px-1.5 py-0.5 rounded">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono flex items-center gap-2 mt-0.5">
                    <span>{formatDistance(entry.totalDistanceMeters)}</span>
                    <span>•</span>
                    <span>{entry.runsCount} runs</span>
                  </div>
                </div>
              </div>

              {/* Primary Rank Metric */}
              <div className="text-right">
                <div className="text-sm font-bold font-mono text-[#FF5F1F]">
                  {formatArea(entry.totalTerritoryMeters)}
                </div>
                <span className="text-[10px] text-gray-500 uppercase font-mono">Territory</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
