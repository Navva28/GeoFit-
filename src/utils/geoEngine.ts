import { GpsPoint, GpsFilterConfig } from '../types';

export const EARTH_RADIUS_METERS = 6378137;

export const DEFAULT_GPS_CONFIG: GpsFilterConfig = {
  minAccuracyMeters: 40, // Reject points with GPS error radius > 40m
  minDistanceDeltaMeters: 2.0, // Minimum movement between consecutive points to filter stationary jitter
  maxSpeedMps: 13.5, // 13.5 m/s (~48.6 km/h) max reasonable sprinting/cycling speed
  loopClosingDistanceThresholdMeters: 22.0, // Distance to start point to trigger closed loop
  minPointsForLoop: 7, // Minimum coordinate vertices required for a polygon
  minRunDistanceForLoopMeters: 45.0, // Minimum running distance before loop closure is enabled
  minDurationSecondsForLoop: 15, // Minimum time active before loop closure is valid
  minAreaMeters: 25.0, // Minimum polygon area in m² to count as real territory
};

/**
 * Calculates great-circle distance between two points using the Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return 0;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
  return EARTH_RADIUS_METERS * c;
}

export function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Calculates total cumulative route distance
 */
export function calculateTotalDistance(points: GpsPoint[]): number {
  if (!points || points.length < 2) return 0;
  const valid = points.filter(p => p && isValidCoordinate(p.latitude, p.longitude));
  if (valid.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < valid.length; i++) {
    total += calculateHaversineDistance(
      valid[i - 1].latitude,
      valid[i - 1].longitude,
      valid[i].latitude,
      valid[i].longitude
    );
  }
  return total;
}

/**
 * Calculates the exact geodesic spherical polygon area in square meters.
 * Uses the spherical excess formula / Gauss-Bonnet theorem.
 */
export function calculateGeodesicPolygonArea(points: GpsPoint[]): number {
  if (!points || points.length < 3) return 0;
  const valid = points.filter(p => p && isValidCoordinate(p.latitude, p.longitude));
  if (valid.length < 3) return 0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const len = valid.length;
  let totalAngle = 0;

  for (let i = 0; i < len; i++) {
    const p1 = valid[i];
    const p2 = valid[(i + 1) % len];
    const p3 = valid[(i + 2) % len];

    const lat1 = toRad(p1.latitude);
    const lon1 = toRad(p1.longitude);
    const lat2 = toRad(p2.latitude);
    const lon2 = toRad(p2.longitude);
    const lat3 = toRad(p3.latitude);
    const lon3 = toRad(p3.longitude);

    // Spherical excess component
    totalAngle += (lon3 - lon1) * Math.sin(lat2);
  }

  const area = Math.abs((totalAngle * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2);
  return Number.isFinite(area) ? area : 0;
}

/**
 * Convert square meters to acres
 */
export function squareMetersToAcres(sqMeters: number): number {
  return sqMeters * 0.000247105;
}

/**
 * GPS Point Filter
 * Checks if a newly reported GPS position is clean and valid
 */
export function isValidGpsPoint(
  newPoint: GpsPoint,
  lastPoint: GpsPoint | null,
  config: GpsFilterConfig = DEFAULT_GPS_CONFIG
): { valid: boolean; reason?: string } {
  // 1. Accuracy Check
  if (newPoint.accuracy > config.minAccuracyMeters) {
    return { valid: false, reason: `Accuracy too low (${Math.round(newPoint.accuracy)}m > ${config.minAccuracyMeters}m)` };
  }

  // 2. Latitude/Longitude Sanity Check
  if (
    isNaN(newPoint.latitude) ||
    isNaN(newPoint.longitude) ||
    newPoint.latitude < -90 ||
    newPoint.latitude > 90 ||
    newPoint.longitude < -180 ||
    newPoint.longitude > 180
  ) {
    return { valid: false, reason: 'Invalid GPS coordinates' };
  }

  // If this is the first point, it is valid
  if (!lastPoint) {
    return { valid: true };
  }

  // 3. Movement threshold check (stationary filter)
  const distance = calculateHaversineDistance(
    lastPoint.latitude,
    lastPoint.longitude,
    newPoint.latitude,
    newPoint.longitude
  );

  if (distance < config.minDistanceDeltaMeters) {
    return { valid: false, reason: 'Movement below threshold (jitter filter)' };
  }

  // 4. Speed sanity check
  const timeDeltaSec = (newPoint.timestamp - lastPoint.timestamp) / 1000;
  if (timeDeltaSec > 0) {
    const computedSpeed = distance / timeDeltaSec;
    if (computedSpeed > config.maxSpeedMps) {
      return { valid: false, reason: `Speed spike detected (${(computedSpeed * 3.6).toFixed(1)} km/h)` };
    }
  }

  return { valid: true };
}

export interface LoopDetectionResult {
  isClosed: boolean;
  distanceToStart: number;
  areaMeters: number;
  areaAcres: number;
  reason?: string;
  polygonPoints: GpsPoint[];
}

/**
 * Evaluates whether the current route constitutes a valid closed loop territory
 */
export function checkClosedLoop(
  points: GpsPoint[],
  currentDurationSeconds: number,
  totalDistanceMeters: number,
  config: GpsFilterConfig = DEFAULT_GPS_CONFIG
): LoopDetectionResult {
  if (points.length < config.minPointsForLoop) {
    return {
      isClosed: false,
      distanceToStart: points.length > 0 ? 0 : Infinity,
      areaMeters: 0,
      areaAcres: 0,
      reason: `Need at least ${config.minPointsForLoop} points (current: ${points.length})`,
      polygonPoints: [],
    };
  }

  const startPoint = points[0];
  const currentPoint = points[points.length - 1];

  const distanceToStart = calculateHaversineDistance(
    currentPoint.latitude,
    currentPoint.longitude,
    startPoint.latitude,
    startPoint.longitude
  );

  // Check if current point is within closing radius
  const isNearStart = distanceToStart <= config.loopClosingDistanceThresholdMeters;

  // Validate run conditions
  const hasMinimumDistance = totalDistanceMeters >= config.minRunDistanceForLoopMeters;
  const hasMinimumDuration = currentDurationSeconds >= config.minDurationSecondsForLoop;

  if (!isNearStart) {
    return {
      isClosed: false,
      distanceToStart,
      areaMeters: 0,
      areaAcres: 0,
      reason: `Return within ${Math.round(config.loopClosingDistanceThresholdMeters)}m of start (currently ${Math.round(distanceToStart)}m away)`,
      polygonPoints: [],
    };
  }

  if (!hasMinimumDistance) {
    return {
      isClosed: false,
      distanceToStart,
      areaMeters: 0,
      areaAcres: 0,
      reason: `Need at least ${Math.round(config.minRunDistanceForLoopMeters)}m total distance (current: ${Math.round(totalDistanceMeters)}m)`,
      polygonPoints: [],
    };
  }

  if (!hasMinimumDuration) {
    return {
      isClosed: false,
      distanceToStart,
      areaMeters: 0,
      areaAcres: 0,
      reason: `Active for ${currentDurationSeconds}s (minimum ${config.minDurationSecondsForLoop}s required)`,
      polygonPoints: [],
    };
  }

  // Create closed polygon representation by appending startPoint at end
  const polygonPoints = [...points, startPoint];
  const areaMeters = calculateGeodesicPolygonArea(polygonPoints);
  const areaAcres = squareMetersToAcres(areaMeters);

  if (areaMeters < config.minAreaMeters) {
    return {
      isClosed: false,
      distanceToStart,
      areaMeters,
      areaAcres,
      reason: `Enclosed area too small (${Math.round(areaMeters)}m² < ${config.minAreaMeters}m²)`,
      polygonPoints: [],
    };
  }

  return {
    isClosed: true,
    distanceToStart,
    areaMeters,
    areaAcres,
    reason: 'Valid closed loop detected! Territory ready for capture.',
    polygonPoints,
  };
}

/**
 * Format distance in meters to a readable string (e.g. "3.82 km" or "450 m")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Format area in square meters
 */
export function formatArea(sqMeters: number): string {
  if (sqMeters >= 1000000) {
    return `${(sqMeters / 1000000).toFixed(2)} km²`;
  }
  return `${Math.round(sqMeters).toLocaleString()} m²`;
}

/**
 * Format area in acres
 */
export function formatAreaAcres(sqMeters: number): string {
  const acres = squareMetersToAcres(sqMeters);
  return `${acres.toFixed(2)} acres`;
}

/**
 * Format duration in seconds to "MM:SS" or "HH:MM:SS"
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format pace (min/km)
 */
export function formatPace(distanceMeters: number, durationSeconds: number): string {
  if (distanceMeters <= 0 || durationSeconds <= 0) return "--'--\" /km";
  const distanceKm = distanceMeters / 1000;
  const paceSecondsPerKm = durationSeconds / distanceKm;

  if (paceSecondsPerKm > 3600 || !isFinite(paceSecondsPerKm)) return "--'--\" /km";

  const minutes = Math.floor(paceSecondsPerKm / 60);
  const seconds = Math.floor(paceSecondsPerKm % 60);
  return `${minutes}'${seconds.toString().padStart(2, '0')}" /km`;
}

/**
 * Calculates initial bearing in degrees (0-360) from point 1 to point 2
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return 0;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));

  const brng = toDeg(Math.atan2(y, x));
  const normalized = (brng + 360) % 360;
  return Number.isFinite(normalized) ? normalized : 0;
}

/**
 * Convert bearing in degrees to 8-point cardinal compass direction
 */
export function getCardinalDirection(bearingDegrees: number): string {
  if (!Number.isFinite(bearingDegrees)) return 'N';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearingDegrees / 45) % 8;
  return directions[index] || 'N';
}

/**
 * Calculates prospective enclosed area if user were to close loop right now
 */
export function calculateEstimatedClosingArea(points: GpsPoint[]): number {
  if (!points || points.length < 3) return 0;
  const valid = points.filter(p => p && isValidCoordinate(p.latitude, p.longitude));
  if (valid.length < 3) return 0;
  // Closed polygon from points + start point
  const prospectivePoints = [...valid, valid[0]];
  return calculateGeodesicPolygonArea(prospectivePoints);
}

/**
 * Calculates centroid of a polygon coordinate array
 */
export function calculatePolygonCentroid(points: GpsPoint[]): { latitude: number; longitude: number } {
  if (!points || points.length === 0) {
    return { latitude: 37.7749, longitude: -122.4194 };
  }
  const valid = points.filter(p => p && isValidCoordinate(p.latitude, p.longitude));
  if (valid.length === 0) {
    return { latitude: 37.7749, longitude: -122.4194 };
  }
  let sumLat = 0;
  let sumLon = 0;
  for (const pt of valid) {
    sumLat += pt.latitude;
    sumLon += pt.longitude;
  }
  const avgLat = sumLat / valid.length;
  const avgLon = sumLon / valid.length;
  return {
    latitude: Number.isFinite(avgLat) ? avgLat : 37.7749,
    longitude: Number.isFinite(avgLon) ? avgLon : -122.4194,
  };
}

