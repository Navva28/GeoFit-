import { GpsPoint, RunRecord, RunState, Territory } from '../types';
import { calculateHaversineDistance, checkClosedLoop, LoopDetectionResult, DEFAULT_GPS_CONFIG } from '../utils/geoEngine';
import { gpsService, GpsLocationState } from './gpsService';
import { storageService } from './storageService';
import { DEMO_PRESETS, generateRelativeLoop } from './demoRoutes';

export interface ActiveRunSnapshot {
  state: RunState;
  points: GpsPoint[];
  distanceMeters: number;
  durationSeconds: number;
  currentSpeedKmh: number;
  averageSpeedKmh: number;
  isSimulated: boolean;
  startPoint: GpsPoint | null;
  currentPoint: GpsPoint | null;
  loopResult: LoopDetectionResult | null;
  lastCapturedTerritory: Territory | null;
}

export type RunManagerListener = (snapshot: ActiveRunSnapshot) => void;

export class RunManager {
  private static instance: RunManager;
  private state: RunState = 'IDLE';
  private points: GpsPoint[] = [];
  private distanceMeters = 0;
  private durationSeconds = 0;
  private timerInterval: number | null = null;
  private isSimulated = false;
  private loopResult: LoopDetectionResult | null = null;
  private lastCapturedTerritory: Territory | null = null;
  private listeners: Set<RunManagerListener> = new Set();
  private unsubscribeGps: (() => void) | null = null;

  private constructor() {
    this.unsubscribeGps = gpsService.subscribe(this.handleLocationUpdate.bind(this));
  }

  public static getInstance(): RunManager {
    if (!RunManager.instance) {
      RunManager.instance = new RunManager();
    }
    return RunManager.instance;
  }

  public subscribe(listener: RunManagerListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  public getSnapshot(): ActiveRunSnapshot {
    const currentPoint = this.points.length > 0 ? this.points[this.points.length - 1] : gpsService.getState().currentPoint;
    const startPoint = this.points.length > 0 ? this.points[0] : null;

    const currentSpeedKmh = currentPoint?.speed ? currentPoint.speed * 3.6 : 0;
    const averageSpeedKmh =
      this.durationSeconds > 0 ? (this.distanceMeters / 1000 / (this.durationSeconds / 3600)) : 0;

    return {
      state: this.state,
      points: [...this.points],
      distanceMeters: this.distanceMeters,
      durationSeconds: this.durationSeconds,
      currentSpeedKmh,
      averageSpeedKmh,
      isSimulated: this.isSimulated,
      startPoint,
      currentPoint,
      loopResult: this.loopResult,
      lastCapturedTerritory: this.lastCapturedTerritory,
    };
  }

  private handleLocationUpdate(point: GpsPoint, rawGpsState: GpsLocationState) {
    if (this.state !== 'TRACKING') return;

    const lastPoint = this.points.length > 0 ? this.points[this.points.length - 1] : null;

    if (lastPoint) {
      const stepDistance = calculateHaversineDistance(
        lastPoint.latitude,
        lastPoint.longitude,
        point.latitude,
        point.longitude
      );
      this.distanceMeters += stepDistance;
    }

    this.points.push(point);

    // Continuous real-time loop detection check
    const loopEval = checkClosedLoop(
      this.points,
      this.durationSeconds,
      this.distanceMeters,
      gpsService.getFilterConfig()
    );
    this.loopResult = loopEval;

    this.notify();
  }

  public startRun(options?: { isDemo?: boolean; demoPresetId?: string; simulationSpeed?: number }) {
    this.resetState();
    this.state = 'TRACKING';
    this.isSimulated = !!options?.isDemo;

    // Start workout clock timer
    this.timerInterval = window.setInterval(() => {
      if (this.state === 'TRACKING') {
        this.durationSeconds++;
        // Also re-evaluate loop conditions as duration advances
        if (this.points.length >= DEFAULT_GPS_CONFIG.minPointsForLoop) {
          this.loopResult = checkClosedLoop(
            this.points,
            this.durationSeconds,
            this.distanceMeters,
            gpsService.getFilterConfig()
          );
        }
        this.notify();
      }
    }, 1000);

    if (this.isSimulated) {
      let routePoints: GpsPoint[] = [];
      const presetId = options?.demoPresetId || 'stanford_quad';

      if (presetId === 'local_radius_loop') {
        const curLoc = gpsService.getState().currentPoint;
        const centerLat = curLoc?.latitude || 37.7749;
        const centerLng = curLoc?.longitude || -122.4194;
        routePoints = generateRelativeLoop(centerLat, centerLng, 65, 24);
      } else {
        const preset = DEMO_PRESETS.find((p) => p.id === presetId) || DEMO_PRESETS[0];
        routePoints = preset.points;
      }

      gpsService.startSimulation(routePoints, options?.simulationSpeed || 2);
    } else {
      gpsService.startLiveTracking();
    }

    this.notify();
  }

  public pauseRun() {
    if (this.state === 'TRACKING') {
      this.state = 'PAUSED';
      if (this.isSimulated) {
        gpsService.stopSimulation();
      } else {
        gpsService.stopLiveTracking();
      }
      this.notify();
    }
  }

  public resumeRun() {
    if (this.state === 'PAUSED') {
      this.state = 'TRACKING';
      if (this.isSimulated) {
        // Resume simulation from remaining points
        gpsService.startLiveTracking(); // or continue
      } else {
        gpsService.startLiveTracking();
      }
      this.notify();
    }
  }

  public finishRun(): { run: RunRecord; territory: Territory | null } {
    const wasTracking = this.state === 'TRACKING' || this.state === 'PAUSED';
    this.state = 'COMPLETED';

    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    gpsService.stopLiveTracking();
    gpsService.stopSimulation();

    const user = storageService.getUserProfile();
    const runId = 'run_' + Date.now();
    const now = Date.now();

    // Check if route formed a valid closed territory
    const loopEval = checkClosedLoop(
      this.points,
      this.durationSeconds,
      this.distanceMeters,
      gpsService.getFilterConfig()
    );

    let territory: Territory | null = null;

    if (loopEval.isClosed && loopEval.areaMeters > 0) {
      const territoryId = 'terr_' + Date.now();
      const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      territory = {
        territoryId,
        userId: user.userId,
        runId,
        points: loopEval.polygonPoints,
        areaMeters: loopEval.areaMeters,
        areaAcres: loopEval.areaAcres,
        name: `Sector ${territoryId.slice(-4).toUpperCase()}`,
        color: randomColor,
        createdAt: now,
      };

      this.lastCapturedTerritory = territory;
      storageService.saveTerritory(territory);
    }

    const avgSpeed =
      this.durationSeconds > 0 ? (this.distanceMeters / 1000 / (this.durationSeconds / 3600)) : 0;

    const runRecord: RunRecord = {
      runId,
      userId: user.userId,
      startTime: now - this.durationSeconds * 1000,
      endTime: now,
      durationSeconds: this.durationSeconds,
      distanceMeters: this.distanceMeters,
      averageSpeedKmh: avgSpeed,
      maxSpeedKmh: avgSpeed * 1.3,
      points: [...this.points],
      territoryCaptured: !!territory,
      territoryId: territory?.territoryId,
      areaCapturedMeters: territory?.areaMeters,
      isDemoRun: this.isSimulated,
      createdAt: now,
    };

    if (wasTracking && this.points.length > 0) {
      storageService.saveRun(runRecord);
    }

    this.notify();
    return { run: runRecord, territory };
  }

  public resetState() {
    this.state = 'IDLE';
    this.points = [];
    this.distanceMeters = 0;
    this.durationSeconds = 0;
    this.loopResult = null;
    this.lastCapturedTerritory = null;
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    gpsService.reset();
    this.notify();
  }
}

export const runManager = RunManager.getInstance();
