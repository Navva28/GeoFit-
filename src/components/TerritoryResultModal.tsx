import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Territory, RunRecord } from '../types';
import { formatArea, formatAreaAcres, formatDistance, formatDuration, formatPace } from '../utils/geoEngine';
import { Trophy, ShieldCheck, MapPin, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';

interface TerritoryResultModalProps {
  isOpen: boolean;
  territory: Territory | null;
  run: RunRecord | null;
  onViewTerritory: () => void;
  onDone: () => void;
}

export const TerritoryResultModal: React.FC<TerritoryResultModalProps> = ({
  isOpen,
  territory,
  run,
  onViewTerritory,
  onDone,
}) => {
  useEffect(() => {
    if (isOpen && territory) {
      // Launch celebratory particle confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ffffff'],
        });
      } catch (err) {
        console.log('Confetti error:', err);
      }
    }
  }, [isOpen, territory]);

  if (!isOpen || !run) return null;

  const isTerritoryCaptured = !!territory;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#0F0F0F] border border-[#222222] p-6 sm:p-8 shadow-2xl text-[#F5F5F5]"
        >
          {/* Background Ambient Glow */}
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
            style={{ backgroundColor: '#FF5F1F' }}
          />

          {/* Header Badge */}
          <div className="flex flex-col items-center text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(255,95,31,0.4)] mb-4 border border-white/20"
              style={{
                backgroundColor: '#FF5F1F',
              }}
            >
              {isTerritoryCaptured ? (
                <ShieldCheck className="w-9 h-9 text-white" />
              ) : (
                <CheckCircle className="w-9 h-9 text-white" />
              )}
            </div>

            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#FF5F1F] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {isTerritoryCaptured ? 'CLOSED LOOP VALIDATED' : 'RUN SESSION RECORDED'}
            </span>

            <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white mt-1">
              {isTerritoryCaptured ? 'TERRITORY CAPTURED!' : 'SESSION COMPLETE'}
            </h2>

            <p className="text-xs text-gray-400 mt-1 max-w-xs font-mono">
              {isTerritoryCaptured
                ? `You have claimed ${territory?.name || 'Sector'} into your digital dominion.`
                : 'Run recorded. Complete a closed loop to claim territory on the grid.'}
            </p>
          </div>

          {/* Big Stat Box for Territory */}
          {isTerritoryCaptured && territory && (
            <div className="mt-6 p-4 rounded-2xl bg-[#121212] border border-[#222222] text-center relative overflow-hidden">
              <span className="text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                New Territory Area
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono text-[#FF5F1F] mt-1">
                +{formatArea(territory.areaMeters)}
              </div>
              <div className="text-xs text-gray-400 font-mono mt-0.5">
                ({formatAreaAcres(territory.areaMeters)})
              </div>
            </div>
          )}

          {/* Performance Stats Grid */}
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-[#121212] border border-[#222222] text-center">
              <span className="text-[10px] text-gray-500 uppercase font-mono">Distance</span>
              <div className="text-sm sm:text-base font-bold font-mono text-white mt-0.5">
                {formatDistance(run.distanceMeters)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121212] border border-[#222222] text-center">
              <span className="text-[10px] text-gray-500 uppercase font-mono">Time</span>
              <div className="text-sm sm:text-base font-bold font-mono text-white mt-0.5">
                {formatDuration(run.durationSeconds)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121212] border border-[#222222] text-center">
              <span className="text-[10px] text-gray-500 uppercase font-mono">Avg Pace</span>
              <div className="text-sm sm:text-base font-bold font-mono text-white mt-0.5">
                {formatPace(run.distanceMeters, run.durationSeconds)}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-6 flex flex-col gap-2.5">
            {isTerritoryCaptured && (
              <button
                id="btn-result-view-territory"
                onClick={onViewTerritory}
                className="w-full py-3.5 rounded-full bg-[#FF5F1F] hover:bg-[#ff7842] text-white font-bold uppercase tracking-widest text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,95,31,0.4)] transition-all active:scale-[0.98] cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                <span>VIEW TERRITORY ON MAP</span>
              </button>
            )}

            <button
              id="btn-result-done"
              onClick={onDone}
              className={`w-full py-3.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${
                isTerritoryCaptured
                  ? 'bg-[#1A1A1A] hover:bg-[#222222] border border-[#333333] text-white'
                  : 'bg-[#FF5F1F] hover:bg-[#ff7842] text-white shadow-[0_0_20px_rgba(255,95,31,0.4)]'
              }`}
            >
              <span>DONE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
