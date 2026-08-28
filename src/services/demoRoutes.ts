import { GpsPoint } from '../types';

export interface DemoRoutePreset {
  id: string;
  name: string;
  description: string;
  approxDistanceMeters: number;
  approxAreaMeters: number;
  points: GpsPoint[];
}

/**
 * Generate a smooth closed loop polygon of GPS points around a center coordinate
 */
export function generateRelativeLoop(
  centerLat: number,
  centerLng: number,
  radiusMeters: number = 75,
  pointCount: number = 32
): GpsPoint[] {
  const points: GpsPoint[] = [];
  const startTime = Date.now() - pointCount * 2000;
  const latRadius = radiusMeters / 111139;
  const lngRadius = radiusMeters / (111139 * Math.cos((centerLat * Math.PI) / 180));

  for (let i = 0; i < pointCount; i++) {
    const angle = (i / (pointCount - 1)) * 2 * Math.PI;
    
    // Introduce slight natural human trajectory perturbation (not a sterile circle)
    const wobble = 1.0 + 0.12 * Math.sin(angle * 3) + 0.08 * Math.cos(angle * 2);
    const lat = centerLat + Math.cos(angle) * latRadius * wobble;
    const lng = centerLng + Math.sin(angle) * lngRadius * wobble;
    
    const accuracy = 4.0 + Math.random() * 4.0; // Realistic phone GPS accuracy 4-8m
    const speed = 2.8 + Math.random() * 0.8; // 2.8 - 3.6 m/s (~10-13 km/h running)

    points.push({
      latitude: lat,
      longitude: lng,
      timestamp: startTime + i * 2000,
      accuracy,
      speed,
      altitude: 45 + Math.sin(i) * 2,
    });
  }

  return points;
}

// Preset 1: Tech Campus Loop (Silicon Valley / Stanford Quad style)
const STANFORD_QUAD_POINTS: GpsPoint[] = [
  { latitude: 37.4275, longitude: -122.1697, timestamp: 1000, accuracy: 5.2, speed: 3.1 },
  { latitude: 37.4278, longitude: -122.1702, timestamp: 3000, accuracy: 4.8, speed: 3.2 },
  { latitude: 37.4284, longitude: -122.1705, timestamp: 5000, accuracy: 5.5, speed: 3.0 },
  { latitude: 37.4291, longitude: -122.1707, timestamp: 7000, accuracy: 4.2, speed: 3.3 },
  { latitude: 37.4298, longitude: -122.1705, timestamp: 9000, accuracy: 5.0, speed: 3.4 },
  { latitude: 37.4303, longitude: -122.1699, timestamp: 11000, accuracy: 4.5, speed: 3.2 },
  { latitude: 37.4305, longitude: -122.1690, timestamp: 13000, accuracy: 5.1, speed: 3.1 },
  { latitude: 37.4304, longitude: -122.1681, timestamp: 15000, accuracy: 4.9, speed: 3.0 },
  { latitude: 37.4299, longitude: -122.1673, timestamp: 17000, accuracy: 4.3, speed: 3.3 },
  { latitude: 37.4292, longitude: -122.1670, timestamp: 19000, accuracy: 5.4, speed: 3.5 },
  { latitude: 37.4285, longitude: -122.1672, timestamp: 21000, accuracy: 4.7, speed: 3.2 },
  { latitude: 37.4279, longitude: -122.1678, timestamp: 23000, accuracy: 5.0, speed: 3.1 },
  { latitude: 37.4275, longitude: -122.1687, timestamp: 25000, accuracy: 4.6, speed: 3.0 },
  { latitude: 37.4275, longitude: -122.1696, timestamp: 27000, accuracy: 4.1, speed: 2.8 }, // Closing loop back to start!
];

// Preset 2: Urban Downtown District Loop (Tokyo Shibuya Park style)
const TOKYO_PARK_POINTS: GpsPoint[] = [
  { latitude: 35.6585, longitude: 139.7013, timestamp: 1000, accuracy: 4.5, speed: 2.9 },
  { latitude: 35.6593, longitude: 139.7015, timestamp: 3000, accuracy: 5.0, speed: 3.0 },
  { latitude: 35.6601, longitude: 139.7020, timestamp: 5000, accuracy: 4.2, speed: 3.2 },
  { latitude: 35.6608, longitude: 139.7031, timestamp: 7000, accuracy: 4.8, speed: 3.1 },
  { latitude: 35.6605, longitude: 139.7042, timestamp: 9000, accuracy: 5.1, speed: 3.0 },
  { latitude: 35.6598, longitude: 139.7048, timestamp: 11000, accuracy: 4.6, speed: 3.3 },
  { latitude: 35.6589, longitude: 139.7045, timestamp: 13000, accuracy: 4.9, speed: 3.2 },
  { latitude: 35.6582, longitude: 139.7036, timestamp: 15000, accuracy: 5.2, speed: 3.0 },
  { latitude: 35.6580, longitude: 139.7024, timestamp: 17000, accuracy: 4.7, speed: 2.9 },
  { latitude: 35.6584, longitude: 139.7014, timestamp: 19000, accuracy: 4.3, speed: 2.7 }, // Closed
];

// Preset 3: Marina Bay Waterfront Circuit (Singapore)
const MARINA_BAY_POINTS: GpsPoint[] = [
  { latitude: 1.2838, longitude: 103.8582, timestamp: 1000, accuracy: 4.0, speed: 3.2 },
  { latitude: 1.2852, longitude: 103.8591, timestamp: 3000, accuracy: 4.5, speed: 3.4 },
  { latitude: 1.2862, longitude: 103.8610, timestamp: 5000, accuracy: 5.0, speed: 3.3 },
  { latitude: 1.2870, longitude: 103.8625, timestamp: 7000, accuracy: 4.2, speed: 3.5 },
  { latitude: 1.2865, longitude: 103.8640, timestamp: 9000, accuracy: 4.9, speed: 3.1 },
  { latitude: 1.2850, longitude: 103.8648, timestamp: 11000, accuracy: 5.3, speed: 3.0 },
  { latitude: 1.2835, longitude: 103.8635, timestamp: 13000, accuracy: 4.7, speed: 3.2 },
  { latitude: 1.2825, longitude: 103.8615, timestamp: 15000, accuracy: 4.4, speed: 3.3 },
  { latitude: 1.2828, longitude: 103.8595, timestamp: 17000, accuracy: 4.8, speed: 3.0 },
  { latitude: 1.2837, longitude: 103.8583, timestamp: 19000, accuracy: 4.1, speed: 2.8 },
];

export const DEMO_PRESETS: DemoRoutePreset[] = [
  {
    id: 'stanford_quad',
    name: 'Campus Quadrangle Loop',
    description: 'A 680m high-yield campus perimeter route enclosing ~28,400 m²',
    approxDistanceMeters: 680,
    approxAreaMeters: 28400,
    points: STANFORD_QUAD_POINTS,
  },
  {
    id: 'tokyo_park',
    name: 'Metropolitan Park Circuit',
    description: 'A 740m urban nature circuit enclosing ~34,800 m²',
    approxDistanceMeters: 740,
    approxAreaMeters: 34800,
    points: TOKYO_PARK_POINTS,
  },
  {
    id: 'local_radius_loop',
    name: 'Current Location Virtual Loop',
    description: 'Generates a 520m loop around your physical GPS coordinates for immediate venue testing',
    approxDistanceMeters: 520,
    approxAreaMeters: 18500,
    points: [], // Dynamically generated from current location
  },
];
