export interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
  speed?: number | null;
  altitude?: number | null;
  heading?: number | null;
}

export interface Territory {
  territoryId: string;
  userId: string;
  runId: string;
  points: GpsPoint[];
  areaMeters: number;
  areaAcres: number;
  name: string;
  color: string;
  createdAt: number;
}

export interface RunRecord {
  runId: string;
  userId: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  distanceMeters: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  points: GpsPoint[];
  territoryCaptured: boolean;
  territoryId?: string;
  areaCapturedMeters?: number;
  isDemoRun?: boolean;
  createdAt: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'territory' | 'distance' | 'streak' | 'special';
  unlockedAt?: number;
}

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  totalDistanceMeters: number;
  totalTerritoryMeters: number;
  totalRuns: number;
  bestRunMeters: number;
  bestTerritoryMeters: number;
  avatarUrl?: string;
  createdAt: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalTerritoryMeters: number;
  totalDistanceMeters: number;
  runsCount: number;
  avatarUrl?: string;
  isCurrentUser?: boolean;
}

export interface GpsFilterConfig {
  minAccuracyMeters: number;
  minDistanceDeltaMeters: number;
  maxSpeedMps: number;
  loopClosingDistanceThresholdMeters: number;
  minPointsForLoop: number;
  minRunDistanceForLoopMeters: number;
  minDurationSecondsForLoop: number;
  minAreaMeters: number;
}

export type RunState = 'IDLE' | 'TRACKING' | 'PAUSED' | 'COMPLETED';

export type AppScreen = 'SPLASH' | 'LOGIN' | 'SIGNUP' | 'HOME' | 'MAP_RUN' | 'LEADERBOARD' | 'PROFILE';
