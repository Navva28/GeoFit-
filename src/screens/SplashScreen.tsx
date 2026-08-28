import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, MapPin, Compass } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="relative w-full h-full min-h-screen bg-[#050505] flex flex-col items-center justify-between p-8 text-[#F5F5F5] overflow-hidden select-none">
      {/* Background Subtle Mesh Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: 'radial-gradient(#222222 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#FF5F1F]/5 blur-3xl pointer-events-none" />
      </div>

      <div className="w-full flex justify-between items-center z-10">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#FF5F1F] animate-pulse" />
          <span>GEOSPATIAL ENGINE V1.0</span>
        </div>
        <span className="text-[10px] uppercase font-mono font-bold text-[#FF5F1F] bg-[#1A1A1A] border border-[#333333] px-2.5 py-0.5 rounded-full">
          TERRITORY GRID
        </span>
      </div>

      {/* Hero Branding */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex flex-col items-center text-center z-10"
      >
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-[#FF5F1F] flex items-center justify-center shadow-[0_0_30px_rgba(255,95,31,0.4)] border border-white/20">
            <span className="text-4xl font-black text-white italic tracking-tighter">G</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0A0A0A] border-2 border-[#FF5F1F] flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FF5F1F]" />
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black font-display tracking-tight text-white uppercase italic flex items-center gap-1">
          GEO<span className="text-[#FF5F1F]">FIT</span>
        </h1>
        <p className="mt-2 text-xs text-neutral-400 max-w-xs font-mono uppercase tracking-wider">
          Move • Close the loop • Claim territory
        </p>
      </motion.div>

      {/* Bottom Loading Progress Indicator */}
      <div className="w-full max-w-xs flex flex-col items-center gap-3 z-10 mb-4">
        <div className="w-full h-1 bg-[#1A1A1A] rounded-full overflow-hidden border border-[#222222]">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.0, ease: 'easeInOut' }}
            className="h-full bg-[#FF5F1F]"
          />
        </div>
        <p className="text-xs text-neutral-500 font-mono">
          Calibrating GPS & Territory Meshes...
        </p>
      </div>
    </div>
  );
};
