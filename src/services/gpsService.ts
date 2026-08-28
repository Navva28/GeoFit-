import { GpsPoint, GpsFilterConfig } from '../types';
import { DEFAULT_GPS_CONFIG, isValidGpsPoint } from '../utils/geoEngine';

export type GpsStatus = 'IDLE' | 'LOCATING' | 'READY' | 'TRACKING' | 'ERROR' | 'DENIED' | 'SIMULATING';

export interface GpsLocationState {
  currentPoint: GpsPoint | null;
  status: GpsStatus;
  errorMessage?: string;
  isSimulated: boolean;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
}

export type LocationCallback = (point: GpsPoint, rawState: GpsLocationState) => void;

export class GpsService {
  private static instance: GpsService;
  private watchId: number | null = null;
  private listeners: Set<LocationCallback> = new Set();
  private lastAcceptedPoint: GpsPoint | null = null;
  private filterConfig: GpsFilterConfig = DEFAULT_GPS_CONFIG;
  private state: GpsLocationState = {
    currentPoint: null,
    status: 'IDLE',
    isSimulated: false,
    accuracy: null,
    heading: null,
    speed: null,
  };

  // Simulation controls
  private simulationInterval: number | null = null;
  private simulationPoints: GpsPoint[] = [];
  private simulationIndex = 0;
  private simulationSpeedMultiplier = 2; // 2x speed for fast hackathon demo

  private constructor() {}

  public static getInstance(): GpsService {
    if (!GpsService.instance) {
      GpsService.instance = new GpsService();
    }
    return GpsService.instance;
  }

  public setFilterConfig(config: Partial<GpsFilterConfig>) {
    this.filterConfig = { ...this.filterConfig, ...config };
  }

  public getFilterConfig(): GpsFilterConfig {
    return { ...this.filterConfig };
  }

  public getState(): GpsLocationState {
    return { ...this.state };
  }

  public subscribe(callback: LocationCallback): () => void {
    this.listeners.add(callback);
    if (this.state.currentPoint) {
      callback(this.state.currentPoint, this.state);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(point: GpsPoint) {
    this.listeners.forEach((callback) => callback(point, this.state));
  }

  /**
   * Request user permission and fetch the immediate single location fix
   */
  public async getInitialLocation(): Promise<GpsPoint> {
    if (!navigator.geolocation) {
      this.state.status = 'ERROR';
      this.state.errorMessage = 'Geolocation is not supported by this browser/device.';
      throw new Error(this.state.errorMessage);
    }

    this.state.status = 'LOCATING';

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const point: GpsPoint = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: position.timestamp,
          };
          this.state.currentPoint = point;
          this.state.status = 'READY';
          this.state.accuracy = point.accuracy;
          this.state.isSimulated = false;
          this.lastAcceptedPoint = point;
          this.notify(point);
          resolve(point);
        },
        (error) => {
          let errorMsg = 'Failed to acquire location.';
          if (error.code === error.PERMISSION_DENIED) {
            this.state.status = 'DENIED';
            errorMsg = 'Location permission was denied. Please allow location access in your browser or switch to Demo Mode.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            this.state.status = 'ERROR';
            errorMsg = 'GPS position unavailable. Check device location services.';
          } else if (error.code === error.TIMEOUT) {
            this.state.status = 'ERROR';
            errorMsg = 'GPS location request timed out.';
          }
          this.state.errorMessage = errorMsg;
          reject(new Error(errorMsg));
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 5000,
        }
      );
    });
  }

  /**
   * Start live GPS stream tracking
   */
  public startLiveTracking(): void {
    this.stopSimulation();
    this.stopLiveTracking();

    if (!navigator.geolocation) {
      this.state.status = 'ERROR';
      this.state.errorMessage = 'Geolocation not supported';
      return;
    }

    this.state.status = 'TRACKING';
    this.state.isSimulated = false;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const rawPoint: GpsPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp || Date.now(),
        };

        this.state.accuracy = rawPoint.accuracy;
        this.state.speed = rawPoint.speed ?? null;
        this.state.heading = rawPoint.heading ?? null;

        // Apply GPS filtering pipeline
        const validation = isValidGpsPoint(rawPoint, this.lastAcceptedPoint, this.filterConfig);

        if (validation.valid) {
          this.lastAcceptedPoint = rawPoint;
          this.state.currentPoint = rawPoint;
          this.state.status = 'TRACKING';
          this.notify(rawPoint);
        } else {
          // Log filtered jitter or low-accuracy point silently
          console.debug('[GPS Filter] Point skipped:', validation.reason);
        }
      },
      (error) => {
        console.warn('[GPS Service] Watch error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          this.state.status = 'DENIED';
          this.state.errorMessage = 'Location permission denied.';
        } else {
          this.state.status = 'ERROR';
          this.state.errorMessage = error.message || 'GPS signal weak.';
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );
  }

  public stopLiveTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.state.status === 'TRACKING') {
      this.state.status = 'READY';
    }
  }

  /**
   * Start Replaying a Demo / Pre-recorded GPS Route
   */
  public startSimulation(points: GpsPoint[], speedMultiplier: number = 2): void {
    this.stopLiveTracking();
    this.stopSimulation();

    if (!points || points.length === 0) return;

    this.simulationPoints = points;
    this.simulationIndex = 0;
    this.simulationSpeedMultiplier = speedMultiplier;
    this.state.isSimulated = true;
    this.state.status = 'SIMULATING';

    const intervalMs = Math.max(200, Math.floor(1000 / speedMultiplier));

    // Emit first point immediately
    const firstPoint = {
      ...this.simulationPoints[0],
      timestamp: Date.now(),
    };
    this.lastAcceptedPoint = firstPoint;
    this.state.currentPoint = firstPoint;
    this.notify(firstPoint);
    this.simulationIndex = 1;

    this.simulationInterval = window.setInterval(() => {
      if (this.simulationIndex >= this.simulationPoints.length) {
        // Reached end of simulation route (or closed loop!)
        this.stopSimulation();
        return;
      }

      const p = this.simulationPoints[this.simulationIndex];
      const pointWithNowTimestamp: GpsPoint = {
        ...p,
        timestamp: Date.now(),
      };

      this.lastAcceptedPoint = pointWithNowTimestamp;
      this.state.currentPoint = pointWithNowTimestamp;
      this.state.accuracy = p.accuracy;
      this.state.speed = p.speed ?? 3.2;
      this.notify(pointWithNowTimestamp);

      this.simulationIndex++;
    }, intervalMs);
  }

  public stopSimulation(): void {
    if (this.simulationInterval !== null) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    if (this.state.status === 'SIMULATING') {
      this.state.status = 'READY';
    }
  }

  public reset(): void {
    this.stopLiveTracking();
    this.stopSimulation();
    this.lastAcceptedPoint = null;
  }
}

export const gpsService = GpsService.getInstance();
