import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, Square, Sparkles, Navigation2, Compass, AlertCircle, RefreshCw, Settings, Sliders, ChevronDown, MapPin, Layers, Shield, Zap, Activity } from 'lucide-react';
import { GpsPoint, Territory, RunState } from '../types';
import { runManager, ActiveRunSnapshot } from '../services/runManager';
import { gpsService, GpsLocationState } from '../services/gpsService';
import { storageService } from '../services/storageService';
import { MapComponent } from '../components/MapComponent';
import { formatArea, formatAreaAcres, formatDistance, formatDuration, formatPace, calculateEstimatedClosingArea } from '../utils/geoEngine';
import { audioFeedback } from '../utils/audioFeedback';
import { DEMO_PRESETS } from '../services/demoRoutes';

interface MapRunScreenProps {
  onRunFinished: (result: { run: any; territory: Territory | null }) => void;
  highlightTerritoryId?: string | null;
}

export const MapRunScreen: React.FC<MapRunScreenProps> = ({
  onRunFinished,
  highlightTerritoryId: initialHighlightTerritoryId,
}) => {
  const [snapshot, setSnapshot] = useState<ActiveRunSnapshot>(runManager.getSnapshot());
  const [gpsState, setGpsState] = useState<GpsLocationState>(gpsService.getState());
  const [territories, setTerritories] = useState<Territory[]>(storageService.getTerritories());
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(initialHighlightTerritoryId || null);

  // Demo Controls
  const [selectedDemoPreset, setSelectedDemoPreset] = useState<string>('stanford_quad');
  const [isDemoModeOpen, setIsDemoModeOpen] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(2);

  // Sector list drawer
  const [isSectorsDrawerOpen, setIsSectorsDrawerOpen] = useState<boolean>(false);

  // Filter settings modal
  const [isFilterSettingsOpen, setIsFilterSettingsOpen] = useState<boolean>(false);
  const [filterConfig, setFilterConfig] = useState(gpsService.getFilterConfig());

  useEffect(() => {
    const unsubRun = runManager.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });

    const unsubGps = gpsService.subscribe((_, newGpsState) => {
      setGpsState(newGpsState);
    });

    setTerritories(storageService.getTerritories());

    // Acquire initial location fix if not yet acquired
    if (!gpsService.getState().currentPoint) {
      gpsService.getInitialLocation().catch((err) => {
        console.warn('GPS initial fix warning:', err);
      });
    }

    return () => {
      unsubRun();
      unsubGps();
    };
  }, []);

  const handleStartRealRun = () => {
    audioFeedback.playRunStart();
    runManager.startRun({ isDemo: false });
  };

  const handleStartDemoRun = () => {
    setIsDemoModeOpen(false);
    audioFeedback.playRunStart();
    runManager.startRun({
      isDemo: true,
      demoPresetId: selectedDemoPreset,
      simulationSpeed: simSpeed,
    });
  };

  const handlePause = () => {
    runManager.pauseRun();
  };

  const handleResume = () => {
    runManager.resumeRun();
  };

  const handleFinish = () => {
    const result = runManager.finishRun();
    setTerritories(storageService.getTerritories());
    onRunFinished(result);
  };

  const isTracking = snapshot.state === 'TRACKING';
  const isPaused = snapshot.state === 'PAUSED';
  const isRunning = isTracking || isPaused;
  const isLoopClosedCandidate = !!snapshot.loopResult?.isClosed;

  // Prospective live area computation
  const prospectiveAreaMeters =
    isRunning && snapshot.points.length >= 3
      ? calculateEstimatedClosingArea(snapshot.points)
      : 0;

  // Instant speed (km/h)
  const currentSpeedKmh = snapshot.currentPoint?.speed
    ? Math.max(0, snapshot.currentPoint.speed * 3.6)
    : 0;

  return (
    <div className="relative w-full h-[calc(100dvh-64px)] min-h-[500px] bg-[#050505] text-[#F5F5F5] overflow-hidden">
      {/* Full-Screen Map Container */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          currentLocation={snapshot.currentPoint || gpsState.currentPoint}
          routePoints={snapshot.points}
          startPoint={snapshot.startPoint}
          territories={territories}
          isTracking={isRunning}
          isClosedLoopCandidate={isLoopClosedCandidate}
          closingThresholdMeters={filterConfig.loopClosingDistanceThresholdMeters}
          highlightTerritoryId={activeHighlightId}
          onSelectTerritory={(t) => setActiveHighlightId(t.territoryId)}
        />
      </div>

      {/* Top Floating Telemetry / Status Header */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-2 pointer-events-none">
        {/* Top Status Bar */}
        <div className="flex items-center justify-between pointer-events-auto">
          {/* Active Mode Badge */}
          {snapshot.isSimulated ? (
            <div className="px-3 py-1 rounded-full bg-[#FF5F1F] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,95,31,0.4)]">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>REPLAYED GPS ROUTE</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-[#0F0F0F]/90 backdrop-blur-md border border-[#222222] text-neutral-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRunning ? 'bg-[#FF5F1F] animate-pulse' : 'bg-white'
                }`}
              />
              <span>
                {isRunning
                  ? 'RECORDING RUN'
                  : gpsState.status === 'READY'
                  ? 'GPS LOCKED'
                  : 'GPS ACTIVE'}
              </span>
              {gpsState.accuracy && (
                <span className="text-neutral-500 font-mono">
                  (±{Math.round(gpsState.accuracy)}m)
                </span>
              )}
            </div>
          )}

          {/* Quick Settings, Sector List & Demo Selector */}
          {!isRunning && (
            <div className="flex items-center gap-2">
              {/* Sector Grid Drawer Button */}
              {territories.length > 0 && (
                <button
                  id="btn-toggle-sectors-drawer"
                  onClick={() => setIsSectorsDrawerOpen(!isSectorsDrawerOpen)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#1A1A1A] hover:bg-[#222222] border border-[#333333] text-gray-200 text-xs font-mono font-bold flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                >
                  <Shield className="w-3.5 h-3.5 text-[#FF5F1F]" />
                  <span>Sectors ({territories.length})</span>
                </button>
              )}

              <button
                id="btn-demo-selector-toggle"
                onClick={() => setIsDemoModeOpen(!isDemoModeOpen)}
                className="px-2.5 py-1.5 rounded-xl bg-[#1A1A1A] hover:bg-[#222222] border border-[#333333] text-gray-200 text-xs font-mono font-bold flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FF5F1F]" />
                <span>Demo Routes</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              <button
                id="btn-filter-settings-toggle"
                onClick={() => setIsFilterSettingsOpen(true)}
                title="GPS Filter Settings"
                className="w-8 h-8 rounded-xl bg-[#1A1A1A] hover:bg-[#222222] border border-[#333333] text-gray-400 hover:text-white flex items-center justify-center shadow-md transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* GPS Denied / Error Warning */}
        {gpsState.status === 'DENIED' && (
          <div className="pointer-events-auto p-3 rounded-2xl bg-red-950/90 border border-red-500/50 text-red-200 text-xs flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>Location permission denied. Use Demo Mode for testing.</span>
            </div>
            <button
              onClick={handleStartDemoRun}
              className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white font-bold text-[11px] rounded-lg shrink-0 cursor-pointer"
            >
              Start Demo
            </button>
          </div>
        )}

        {/* Live HUD Telemetry Card when running */}
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto overflow-hidden rounded-2xl bg-[#0F0F0F]/95 backdrop-blur-md border border-[#222222] p-4 shadow-2xl"
          >
            {/* Primary Telemetry Grid */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div>
                <span className="text-[9px] uppercase font-mono text-gray-500">Distance</span>
                <div className="text-lg sm:text-xl font-bold font-mono text-white mt-0.5">
                  {formatDistance(snapshot.distanceMeters)}
                </div>
              </div>

              <div>
                <span className="text-[9px] uppercase font-mono text-gray-500">Duration</span>
                <div className="text-lg sm:text-xl font-bold font-mono text-[#FF5F1F] mt-0.5">
                  {formatDuration(snapshot.durationSeconds)}
                </div>
              </div>

              <div>
                <span className="text-[9px] uppercase font-mono text-gray-500">Speed</span>
                <div className="text-lg sm:text-xl font-bold font-mono text-white mt-0.5">
                  {currentSpeedKmh.toFixed(1)} <span className="text-[9px] text-gray-400">km/h</span>
                </div>
              </div>

              <div>
                <span className="text-[9px] uppercase font-mono text-gray-500">Avg Pace</span>
                <div className="text-lg sm:text-xl font-bold font-mono text-white mt-0.5">
                  {formatPace(snapshot.distanceMeters, snapshot.durationSeconds)}
                </div>
              </div>
            </div>

            {/* Loop Closure & Prospective Territory Status */}
            <div className="mt-3 pt-2.5 border-t border-[#222222] flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 flex-1 pr-2 truncate">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isLoopClosedCandidate
                      ? 'bg-[#FF5F1F] animate-ping'
                      : snapshot.loopResult?.distanceToStart && snapshot.loopResult.distanceToStart < 60
                      ? 'bg-amber-400'
                      : 'bg-neutral-600'
                  }`}
                />
                <span className="text-gray-400 font-mono text-[11px] truncate">
                  {snapshot.loopResult?.reason || 'Carving live polygon boundaries...'}
                </span>
              </div>

              {/* Prospective Area Preview */}
              <div className="shrink-0 flex items-center gap-1.5">
                <span className="text-[9px] font-mono uppercase text-gray-500">Carved:</span>
                <span className="text-xs font-bold font-mono text-[#FF5F1F] bg-[#1A1A1A] border border-[#333333] px-2 py-0.5 rounded-md">
                  {formatArea(isLoopClosedCandidate ? snapshot.loopResult?.areaMeters || 0 : prospectiveAreaMeters)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-20 left-4 right-4 z-30 pointer-events-auto flex justify-center">
        {!isRunning ? (
          /* PRE-RUN CONTROLS */
          <div className="w-full flex flex-col gap-2.5">
            <motion.button
              id="btn-map-start-live-run"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartRealRun}
              className="w-full h-15 rounded-full bg-[#FF5F1F] text-white font-bold uppercase tracking-widest text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(255,95,31,0.4)] hover:shadow-[0_0_30px_rgba(255,95,31,0.6)] cursor-pointer transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
              </div>
              <span>START LIVE GPS RUN</span>
            </motion.button>
          </div>
        ) : (
          /* ACTIVE RUN CONTROLS (Pause/Resume, Finish & Capture) */
          <div className="flex items-center justify-center gap-4 w-full">
            {isTracking ? (
              <button
                id="btn-map-pause-run"
                onClick={handlePause}
                title="Pause Run"
                className="h-14 w-14 rounded-full bg-[#1A1A1A] border border-[#333333] hover:bg-[#222222] text-white flex items-center justify-center shadow-lg active:scale-95 cursor-pointer shrink-0"
              >
                <Pause className="w-5 h-5 fill-white" />
              </button>
            ) : (
              <button
                id="btn-map-resume-run"
                onClick={handleResume}
                title="Resume Run"
                className="h-14 w-14 rounded-full bg-[#FF5F1F] text-white flex items-center justify-center shadow-lg shadow-[#FF5F1F]/30 active:scale-95 cursor-pointer shrink-0"
              >
                <Play className="w-5 h-5 fill-white ml-0.5" />
              </button>
            )}

            <button
              id="btn-map-finish-run"
              onClick={handleFinish}
              className={`flex-1 max-w-xs h-14 rounded-full font-bold uppercase tracking-widest text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer ${
                isLoopClosedCandidate
                  ? 'bg-[#FF5F1F] text-white shadow-[0_0_25px_rgba(255,95,31,0.5)] animate-pulse'
                  : 'bg-[#1A1A1A] border border-[#333333] hover:bg-[#222222] text-white'
              }`}
            >
              <Square className="w-4 h-4 fill-current" />
              <span>{isLoopClosedCandidate ? 'FINISH & CAPTURE' : 'FINISH RUN'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Sector Quick Drawer / Explorer Modal */}
      {isSectorsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm max-h-[70vh] rounded-2xl bg-[#0F0F0F] border border-[#222222] p-5 shadow-2xl text-[#F5F5F5] flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#FF5F1F]" />
                <h3 className="font-bold text-xs uppercase font-mono tracking-wider text-white">
                  Sovereign Sectors ({territories.length})
                </h3>
              </div>
              <button
                onClick={() => setIsSectorsDrawerOpen(false)}
                className="text-xs text-gray-500 hover:text-white cursor-pointer px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 max-h-[50vh] pr-1">
              {territories.map((territory) => (
                <div
                  key={territory.territoryId}
                  onClick={() => {
                    setActiveHighlightId(territory.territoryId);
                    setIsSectorsDrawerOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    activeHighlightId === territory.territoryId
                      ? 'bg-[#1A1A1A] border-[#FF5F1F] text-white'
                      : 'bg-[#0A0A0A] border-[#222222] text-gray-300 hover:border-[#333333]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-tight">{territory.name}</span>
                    <span className="text-[10px] font-mono text-[#FF5F1F] font-bold">
                      {formatArea(territory.areaMeters)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono mt-1">
                    <span>{formatAreaAcres(territory.areaMeters)}</span>
                    <span>{new Date(territory.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Demo Preset Selector Modal */}
      {isDemoModeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0F0F0F] border border-[#222222] p-5 shadow-2xl text-[#F5F5F5] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF5F1F]" />
                <h3 className="font-bold text-xs uppercase font-mono tracking-wider text-white">Demo / Replay GPS</h3>
              </div>
              <button
                onClick={() => setIsDemoModeOpen(false)}
                className="text-xs text-gray-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400 font-mono">
              Select a closed-loop route for hackathon presentations or testing:
            </p>

            <div className="space-y-2">
              {DEMO_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => setSelectedDemoPreset(preset.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedDemoPreset === preset.id
                      ? 'bg-[#1A1A1A] border-[#FF5F1F] text-white shadow-[0_0_15px_rgba(255,95,31,0.2)]'
                      : 'bg-[#0A0A0A] border-[#222222] text-gray-300 hover:border-[#333333]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-tight">{preset.name}</span>
                    <span className="text-[10px] font-mono text-[#FF5F1F]">
                      {formatArea(preset.approxAreaMeters)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{preset.description}</p>
                </div>
              ))}
            </div>

            {/* Simulation Speed */}
            <div className="pt-2">
              <label className="text-xs text-gray-400 font-mono flex justify-between mb-1">
                <span>Replay Speed</span>
                <span className="font-mono text-[#FF5F1F] font-bold">{simSpeed}x Realtime</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 5, 10].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSimSpeed(spd)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                      simSpeed === spd
                        ? 'bg-[#FF5F1F] text-white border-[#FF5F1F]'
                        : 'bg-[#1A1A1A] border-[#333333] text-gray-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            <button
              id="btn-launch-demo-run"
              onClick={handleStartDemoRun}
              className="w-full py-3.5 rounded-full bg-[#FF5F1F] text-white font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,95,31,0.4)] hover:shadow-[0_0_25px_rgba(255,95,31,0.6)]"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Launch Demo Replay</span>
            </button>
          </div>
        </div>
      )}

      {/* GPS Filter Settings Modal */}
      {isFilterSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0F0F0F] border border-[#222222] p-5 shadow-2xl text-[#F5F5F5] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#FF5F1F]" />
                <h3 className="font-bold text-xs uppercase font-mono tracking-wider text-white">GPS Calibration</h3>
              </div>
              <button
                onClick={() => setIsFilterSettingsOpen(false)}
                className="text-xs text-gray-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-gray-400 font-mono flex justify-between mb-1">
                  <span>Loop Closing Radius</span>
                  <span className="text-[#FF5F1F] font-mono font-bold">
                    {filterConfig.loopClosingDistanceThresholdMeters}m
                  </span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="2"
                  value={filterConfig.loopClosingDistanceThresholdMeters}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFilterConfig({ ...filterConfig, loopClosingDistanceThresholdMeters: val });
                    gpsService.setFilterConfig({ loopClosingDistanceThresholdMeters: val });
                  }}
                  className="w-full accent-[#FF5F1F]"
                />
              </div>

              <div>
                <label className="text-gray-400 font-mono flex justify-between mb-1">
                  <span>Min Run Distance</span>
                  <span className="text-[#FF5F1F] font-mono font-bold">
                    {filterConfig.minRunDistanceForLoopMeters}m
                  </span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="5"
                  value={filterConfig.minRunDistanceForLoopMeters}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFilterConfig({ ...filterConfig, minRunDistanceForLoopMeters: val });
                    gpsService.setFilterConfig({ minRunDistanceForLoopMeters: val });
                  }}
                  className="w-full accent-[#FF5F1F]"
                />
              </div>

              <div>
                <label className="text-gray-400 font-mono flex justify-between mb-1">
                  <span>Noise Filter Delta</span>
                  <span className="text-[#FF5F1F] font-mono font-bold">
                    {filterConfig.minDistanceDeltaMeters}m
                  </span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={filterConfig.minDistanceDeltaMeters}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFilterConfig({ ...filterConfig, minDistanceDeltaMeters: val });
                    gpsService.setFilterConfig({ minDistanceDeltaMeters: val });
                  }}
                  className="w-full accent-[#FF5F1F]"
                />
              </div>
            </div>

            <button
              onClick={() => setIsFilterSettingsOpen(false)}
              className="w-full py-3 rounded-full bg-[#1A1A1A] hover:bg-[#222222] border border-[#333333] text-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
