import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { GpsPoint, Territory } from '../types';
import {
  Layers,
  Crosshair,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Shield,
  Navigation,
  Compass,
  MapPin,
  Sparkles,
  Search,
  Globe,
  Maximize2,
  Minimize2,
  Ruler,
  Mountain,
  Footprints,
  Satellite,
  Sun,
  Moon,
  Check,
  X,
  Loader2,
  Flame,
  Info,
} from 'lucide-react';
import {
  formatArea,
  formatAreaAcres,
  calculateBearing,
  getCardinalDirection,
  calculatePolygonCentroid,
  isValidCoordinate,
} from '../utils/geoEngine';
import { audioFeedback } from '../utils/audioFeedback';
import { GoogleMapsComponent } from './GoogleMapsComponent';
import { storageService } from '../services/storageService';
import { searchNominatimLocations, POPULAR_RUNNING_SPOTS, NominatimSearchResult } from '../services/nominatimService';

interface MapComponentProps {
  currentLocation: GpsPoint | null;
  routePoints: GpsPoint[];
  startPoint: GpsPoint | null;
  territories: Territory[];
  isTracking: boolean;
  isClosedLoopCandidate: boolean;
  closingThresholdMeters?: number;
  highlightTerritoryId?: string | null;
  onSelectTerritory?: (territory: Territory) => void;
}

type MapEngineType = 'google_maps' | 'open_basemap';
export type FreeMapLayerType =
  | 'cyber_dark'
  | 'satellite_hd'
  | 'cyclosm'
  | 'osm_standard'
  | 'humanitarian'
  | 'voyager'
  | 'positron_light'
  | 'topographic'
  | 'tactical_grid';

interface LayerOption {
  id: FreeMapLayerType;
  name: string;
  category: 'Satellite' | 'Trails & Outdoor' | 'Dark / Tactical' | 'Street & Light';
  description: string;
  badge?: string;
}

const FREE_MAP_LAYERS: LayerOption[] = [
  {
    id: 'cyber_dark',
    name: 'Cyber Dark (CARTO)',
    category: 'Dark / Tactical',
    description: 'High-contrast nocturnal theme optimized for neon GPS routes',
    badge: 'Popular',
  },
  {
    id: 'satellite_hd',
    name: 'Satellite Aerial HD (ESRI)',
    category: 'Satellite',
    description: 'Free high-resolution orbital satellite photography worldwide',
    badge: 'Free HD',
  },
  {
    id: 'cyclosm',
    name: 'Running & Trail Tracks (CyclOSM)',
    category: 'Trails & Outdoor',
    description: 'Specialized fitness layer with dedicated jogging paths & footways',
    badge: 'Runners',
  },
  {
    id: 'topographic',
    name: 'Topographic Relief (OpenTopo)',
    category: 'Trails & Outdoor',
    description: 'Elevation contour lines, mountain peaks, and elevation terrain',
  },
  {
    id: 'osm_standard',
    name: 'OpenStreetMap Global',
    category: 'Street & Light',
    description: 'Community-driven global street & building mapping',
  },
  {
    id: 'humanitarian',
    name: 'Humanitarian (HOT OSM)',
    category: 'Street & Light',
    description: 'Vibrant contrast with parks, waterbodies, and urban structures',
  },
  {
    id: 'voyager',
    name: 'Voyager Modern (CARTO)',
    category: 'Street & Light',
    description: 'Sleek, colorful contemporary navigation styling',
  },
  {
    id: 'positron_light',
    name: 'Positron Minimal (CARTO)',
    category: 'Street & Light',
    description: 'Clean monochrome daylight basemap with subdued roads',
  },
  {
    id: 'tactical_grid',
    name: 'Tactical HUD Grid',
    category: 'Dark / Tactical',
    description: 'Zero-tile vector coordinate grid for low-bandwidth stealth runs',
  },
];

export const MapComponent: React.FC<MapComponentProps> = ({
  currentLocation,
  routePoints,
  startPoint,
  territories,
  isTracking,
  isClosedLoopCandidate,
  closingThresholdMeters = 22,
  highlightTerritoryId,
  onSelectTerritory,
}) => {
  const [engine, setEngine] = useState<MapEngineType>('open_basemap');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const searchPinMarkerRef = useRef<L.Marker | null>(null);

  // Layers, Markers & Overlays references
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const startRadiusCircleRef = useRef<L.Circle | null>(null);
  const livePolylineRef = useRef<L.Polyline | null>(null);
  const prospectivePolygonRef = useRef<L.Polygon | null>(null);
  const closingDashlineRef = useRef<L.Polyline | null>(null);
  const territoryPolygonsRef = useRef<Map<string, L.Polygon>>(new Map());
  const territoryLabelsRef = useRef<Map<string, L.Marker>>(new Map());

  const [mapLayer, setMapLayer] = useState<FreeMapLayerType>('cyber_dark');
  const [autoCenter, setAutoCenter] = useState<boolean>(true);
  const [showTerritories, setShowTerritories] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(audioFeedback.isSoundEnabled());
  const [selectedTerritoryDetails, setSelectedTerritoryDetails] = useState<Territory | null>(null);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [showToolsDrawer, setShowToolsDrawer] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Search & Geocoding state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<NominatimSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(null);

  // Map coordinates inspector state
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number; zoom: number }>({
    lat: 37.7749,
    lng: -122.4194,
    zoom: 16,
  });

  const prevCandidateRef = useRef<boolean>(false);

  // Sound feedback on loop closure candidate
  useEffect(() => {
    if (isClosedLoopCandidate && !prevCandidateRef.current) {
      audioFeedback.playLoopClosedSuccess();
    }
    prevCandidateRef.current = isClosedLoopCandidate;
  }, [isClosedLoopCandidate]);

  // Helper to get Tile Layer config for Leaflet with all free providers
  const getTileConfig = (layer: FreeMapLayerType) => {
    switch (layer) {
      case 'cyber_dark':
        return {
          url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          options: {
            maxZoom: 20,
            subdomains: 'abcd',
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            className: 'dark-tiles-layer',
          },
        };
      case 'satellite_hd':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          options: {
            maxZoom: 19,
            attribution: '&copy; Esri, Maxar, Earthstar Geographics, USDA, USGS',
            className: 'satellite-tiles-layer',
          },
        };
      case 'cyclosm':
        return {
          url: 'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
          options: {
            maxZoom: 18,
            subdomains: 'abc',
            attribution: '&copy; OpenStreetMap contributors &copy; CyclOSM',
            className: 'cyclosm-tiles-layer',
          },
        };
      case 'topographic':
        return {
          url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
          options: {
            maxZoom: 17,
            subdomains: 'abc',
            attribution: '&copy; OpenTopoMap contributors &copy; OpenStreetMap',
          },
        };
      case 'osm_standard':
        return {
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          options: {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          },
        };
      case 'humanitarian':
        return {
          url: 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
          options: {
            maxZoom: 19,
            subdomains: 'abc',
            attribution: '&copy; OpenStreetMap contributors, Humanitarian OpenStreetMap Team',
          },
        };
      case 'voyager':
        return {
          url: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
          options: {
            maxZoom: 20,
            subdomains: 'abcd',
            attribution: '&copy; OpenStreetMap &copy; CARTO',
          },
        };
      case 'positron_light':
        return {
          url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          options: {
            maxZoom: 20,
            subdomains: 'abcd',
            attribution: '&copy; OpenStreetMap &copy; CARTO',
          },
        };
      case 'tactical_grid':
      default:
        return null;
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const defaultCenter: L.LatLngTuple =
        currentLocation && isValidCoordinate(currentLocation.latitude, currentLocation.longitude)
          ? [currentLocation.latitude, currentLocation.longitude]
          : [37.7749, -122.4194]; // Fallback to SF or current GPS

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: false,
      });

      // Add Tile Layer
      const cfg = getTileConfig(mapLayer);
      if (cfg) {
        tileLayerRef.current = L.tileLayer(cfg.url, cfg.options).addTo(map);
      }

      mapInstanceRef.current = map;

      // Track center coordinates for HUD
      map.on('move', () => {
        const c = map.getCenter();
        setCenterCoords({
          lat: c.lat,
          lng: c.lng,
          zoom: map.getZoom(),
        });
      });

      // Invalidate size once immediately and once after a short delay
      map.invalidateSize();
      const timer1 = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);

      const timer2 = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 600);

      // Handle user manual pan -> disable auto-center
      map.on('dragstart', () => {
        setAutoCenter(false);
      });

      // ResizeObserver for robust layout adaptation
      const resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        resizeObserver.disconnect();
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (err) {
      console.error('Error initializing map:', err);
    }
  }, []);

  // Update Tile Layer when mapLayer changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    const cfg = getTileConfig(mapLayer);
    if (cfg) {
      tileLayerRef.current = L.tileLayer(cfg.url, cfg.options).addTo(map);
    }
  }, [mapLayer]);

  // Update User Marker & Pulsing Accuracy Ring
  useEffect(() => {
    if (
      !mapInstanceRef.current ||
      !currentLocation ||
      !isValidCoordinate(currentLocation.latitude, currentLocation.longitude)
    ) {
      return;
    }
    const map = mapInstanceRef.current;
    const latLng: L.LatLngTuple = [currentLocation.latitude, currentLocation.longitude];

    // User Beacon Icon
    const customPulseIcon = L.divIcon({
      className: 'user-pulse-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="user-pulse-ring"></div>
          <div class="user-pulse-core"></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(latLng, { icon: customPulseIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(latLng);
    }

    // Accuracy Circle
    const rawAccuracy = currentLocation.accuracy;
    const accuracy = typeof rawAccuracy === 'number' && Number.isFinite(rawAccuracy) && rawAccuracy > 0 ? rawAccuracy : 10;
    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = L.circle(latLng, {
        radius: Math.min(accuracy, 60),
        color: '#FF5F1F',
        weight: 1.5,
        fillColor: '#FF5F1F',
        fillOpacity: 0.12,
      }).addTo(map);
    } else {
      accuracyCircleRef.current.setLatLng(latLng);
      accuracyCircleRef.current.setRadius(Math.min(accuracy, 60));
    }

    // Auto-center camera
    if (autoCenter) {
      map.panTo(latLng, { animate: true, duration: 0.5 });
    }
  }, [currentLocation, autoCenter]);

  // Update Start Point Marker & Closing Threshold Ring
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (startPoint && isTracking && isValidCoordinate(startPoint.latitude, startPoint.longitude)) {
      const startLatLng: L.LatLngTuple = [startPoint.latitude, startPoint.longitude];

      const startIcon = L.divIcon({
        className: 'start-flag-marker',
        html: `
          <div class="w-full h-full flex items-center justify-center text-[10px] font-black text-white font-mono">
            S
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (!startMarkerRef.current) {
        startMarkerRef.current = L.marker(startLatLng, { icon: startIcon, zIndexOffset: 900 }).addTo(map);
      } else {
        startMarkerRef.current.setLatLng(startLatLng);
      }

      // Loop Closing Proximity Ring
      const ringColor = '#FF5F1F';
      const safeRadius = Number.isFinite(closingThresholdMeters) && closingThresholdMeters > 0 ? closingThresholdMeters : 22;
      if (!startRadiusCircleRef.current) {
        startRadiusCircleRef.current = L.circle(startLatLng, {
          radius: safeRadius,
          color: ringColor,
          weight: 2,
          dashArray: '4, 4',
          fillColor: ringColor,
          fillOpacity: isClosedLoopCandidate ? 0.35 : 0.15,
        }).addTo(map);
      } else {
        startRadiusCircleRef.current.setLatLng(startLatLng);
        startRadiusCircleRef.current.setRadius(safeRadius);
        startRadiusCircleRef.current.setStyle({
          color: ringColor,
          fillColor: ringColor,
          fillOpacity: isClosedLoopCandidate ? 0.35 : 0.15,
        });
      }
    } else {
      if (startMarkerRef.current) {
        map.removeLayer(startMarkerRef.current);
        startMarkerRef.current = null;
      }
      if (startRadiusCircleRef.current) {
        map.removeLayer(startRadiusCircleRef.current);
        startRadiusCircleRef.current = null;
      }
    }
  }, [startPoint, isTracking, isClosedLoopCandidate, closingThresholdMeters]);

  // Update Live Route Polyline and Real-time Prospective Territory Area
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const validRoute = routePoints.filter(
      (p) => p && isValidCoordinate(p.latitude, p.longitude)
    );

    if (validRoute.length >= 2) {
      const latLngs: L.LatLngTuple[] = validRoute.map((p) => [p.latitude, p.longitude]);

      // 1. Live Running Track Polyline
      if (!livePolylineRef.current) {
        livePolylineRef.current = L.polyline(latLngs, {
          color: '#FF5F1F',
          weight: 4.5,
          opacity: 1,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map);
      } else {
        livePolylineRef.current.setLatLngs(latLngs);
      }

      // 2. Real-time Prospective Territory Area Polygon
      const hasValidStart = startPoint && isValidCoordinate(startPoint.latitude, startPoint.longitude);
      if (isTracking && validRoute.length >= 3 && hasValidStart) {
        const prospectiveCoords: L.LatLngTuple[] = [
          ...latLngs,
          [startPoint.latitude, startPoint.longitude],
        ];

        if (!prospectivePolygonRef.current) {
          prospectivePolygonRef.current = L.polygon(prospectiveCoords, {
            color: '#FF5F1F',
            weight: 2,
            dashArray: '4, 4',
            fillColor: '#FF5F1F',
            fillOpacity: isClosedLoopCandidate ? 0.4 : 0.18,
          }).addTo(map);
        } else {
          prospectivePolygonRef.current.setLatLngs(prospectiveCoords);
          prospectivePolygonRef.current.setStyle({
            fillOpacity: isClosedLoopCandidate ? 0.4 : 0.18,
          });
        }
      } else if (prospectivePolygonRef.current) {
        map.removeLayer(prospectivePolygonRef.current);
        prospectivePolygonRef.current = null;
      }

      // 3. Laser Closing Line to Start
      const hasValidCur = currentLocation && isValidCoordinate(currentLocation.latitude, currentLocation.longitude);
      if (hasValidStart && hasValidCur && isTracking) {
        const bridgeCoords: L.LatLngTuple[] = [
          [currentLocation.latitude, currentLocation.longitude],
          [startPoint.latitude, startPoint.longitude],
        ];

        if (!closingDashlineRef.current) {
          closingDashlineRef.current = L.polyline(bridgeCoords, {
            color: isClosedLoopCandidate ? '#FFFFFF' : '#FF5F1F',
            weight: isClosedLoopCandidate ? 3 : 1.5,
            dashArray: '5, 5',
            opacity: isClosedLoopCandidate ? 1 : 0.7,
          }).addTo(map);
        } else {
          closingDashlineRef.current.setLatLngs(bridgeCoords);
          closingDashlineRef.current.setStyle({
            color: isClosedLoopCandidate ? '#FFFFFF' : '#FF5F1F',
            weight: isClosedLoopCandidate ? 3 : 1.5,
            opacity: isClosedLoopCandidate ? 1 : 0.7,
          });
        }
      } else if (closingDashlineRef.current) {
        map.removeLayer(closingDashlineRef.current);
        closingDashlineRef.current = null;
      }
    } else {
      if (livePolylineRef.current) {
        map.removeLayer(livePolylineRef.current);
        livePolylineRef.current = null;
      }
      if (prospectivePolygonRef.current) {
        map.removeLayer(prospectivePolygonRef.current);
        prospectivePolygonRef.current = null;
      }
      if (closingDashlineRef.current) {
        map.removeLayer(closingDashlineRef.current);
        closingDashlineRef.current = null;
      }
    }
  }, [routePoints, isClosedLoopCandidate, startPoint, currentLocation, isTracking]);

  // Render Captured Territory Polygons + High-Visibility Area Centroid Badges
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const polyMap = territoryPolygonsRef.current;
    const labelMap = territoryLabelsRef.current;

    // Handle visibility toggle
    if (!showTerritories) {
      polyMap.forEach((polygon) => map.removeLayer(polygon));
      polyMap.clear();
      labelMap.forEach((labelMarker) => map.removeLayer(labelMarker));
      labelMap.clear();
      return;
    }

    // Remove obsolete layers
    const territoryIds = new Set(territories.map((t) => t.territoryId));
    polyMap.forEach((polygon, id) => {
      if (!territoryIds.has(id)) {
        map.removeLayer(polygon);
        polyMap.delete(id);
      }
    });
    labelMap.forEach((labelMarker, id) => {
      if (!territoryIds.has(id)) {
        map.removeLayer(labelMarker);
        labelMap.delete(id);
      }
    });

    // Render or update each territory
    territories.forEach((territory) => {
      const validPoints = (territory.points || []).filter(
        (p) => p && isValidCoordinate(p.latitude, p.longitude)
      );
      if (validPoints.length < 3) return;

      const latLngs: L.LatLngTuple[] = validPoints.map((p) => [p.latitude, p.longitude]);
      const isHighlighted = highlightTerritoryId === territory.territoryId;
      const polyColor = territory.color || '#FF5F1F';

      // 1. Polygon shape
      if (!polyMap.has(territory.territoryId)) {
        const polygon = L.polygon(latLngs, {
          color: polyColor,
          weight: isHighlighted ? 3.5 : 2,
          opacity: 1,
          fillColor: polyColor,
          fillOpacity: isHighlighted ? 0.5 : 0.3,
        }).addTo(map);

        polygon.on('click', () => {
          setSelectedTerritoryDetails(territory);
          if (onSelectTerritory) {
            onSelectTerritory(territory);
          }
          const bounds = polygon.getBounds();
          if (bounds && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], duration: 0.8 });
          }
        });

        polyMap.set(territory.territoryId, polygon);
      } else {
        const existingPolygon = polyMap.get(territory.territoryId);
        if (existingPolygon) {
          existingPolygon.setLatLngs(latLngs);
          existingPolygon.setStyle({
            color: polyColor,
            weight: isHighlighted ? 3.5 : 2,
            fillOpacity: isHighlighted ? 0.5 : 0.3,
          });
        }
      }

      // 2. High-Visibility Area Centroid Chip Label
      const centroid = calculatePolygonCentroid(validPoints);
      if (!isValidCoordinate(centroid.latitude, centroid.longitude)) return;
      const centroidLatLng: L.LatLngTuple = [centroid.latitude, centroid.longitude];

      const areaBadgeHtml = `
        <div class="territory-area-chip ${isHighlighted ? '!border-white !bg-[#FF5F1F] text-white' : ''}">
          <span class="text-[10px] font-black uppercase tracking-tight text-white">${territory.name}</span>
          <span class="text-[9px] font-mono font-bold text-[#FF5F1F] ${isHighlighted ? '!text-white' : ''}">
            ${formatArea(territory.areaMeters)}
          </span>
        </div>
      `;

      const labelIcon = L.divIcon({
        className: 'territory-label-marker',
        html: areaBadgeHtml,
        iconSize: [120, 36],
        iconAnchor: [60, 18],
      });

      if (!labelMap.has(territory.territoryId)) {
        const labelMarker = L.marker(centroidLatLng, {
          icon: labelIcon,
          zIndexOffset: 500,
        }).addTo(map);

        labelMarker.on('click', () => {
          setSelectedTerritoryDetails(territory);
          if (onSelectTerritory) {
            onSelectTerritory(territory);
          }
          const poly = polyMap.get(territory.territoryId);
          if (poly) {
            const bounds = poly.getBounds();
            if (bounds && bounds.isValid()) {
              map.fitBounds(bounds, { padding: [50, 50], duration: 0.8 });
            }
          }
        });

        labelMap.set(territory.territoryId, labelMarker);
      } else {
        const existingLabel = labelMap.get(territory.territoryId);
        if (existingLabel) {
          existingLabel.setLatLng(centroidLatLng);
          existingLabel.setIcon(labelIcon);
        }
      }
    });
  }, [territories, highlightTerritoryId, showTerritories, onSelectTerritory]);

  // Auto-fit bounds when highlightTerritoryId changes
  useEffect(() => {
    if (!mapInstanceRef.current || !highlightTerritoryId) return;
    const targetPolygon = territoryPolygonsRef.current.get(highlightTerritoryId);
    if (targetPolygon) {
      const bounds = targetPolygon.getBounds();
      if (bounds && bounds.isValid()) {
        setAutoCenter(false);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], duration: 0.8 });
      }
    }
  }, [highlightTerritoryId]);

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchNominatimLocations(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.warn('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (lat: number, lon: number, name: string) => {
    if (!mapInstanceRef.current || !isValidCoordinate(lat, lon)) return;
    const map = mapInstanceRef.current;
    setAutoCenter(false);
    setSelectedLocationName(name);
    setShowSearchModal(false);

    map.flyTo([lat, lon], 16, { duration: 1.2 });

    // Place temporary search pin
    if (searchPinMarkerRef.current) {
      searchPinMarkerRef.current.remove();
      searchPinMarkerRef.current = null;
    }

    const pinIcon = L.divIcon({
      className: 'search-pin-marker',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="px-2.5 py-1 rounded-full bg-[#FF5F1F] text-white text-[10px] font-mono font-bold shadow-lg whitespace-nowrap mb-1 animate-bounce">
            📍 ${name.split(',')[0]}
          </div>
          <div class="w-3 h-3 rounded-full bg-[#FF5F1F] border-2 border-white shadow-md"></div>
        </div>
      `,
      iconSize: [120, 40],
      iconAnchor: [60, 40],
    });

    searchPinMarkerRef.current = L.marker([lat, lon], { icon: pinIcon }).addTo(map);
  };

  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleRecenter = () => {
    if (
      mapInstanceRef.current &&
      currentLocation &&
      isValidCoordinate(currentLocation.latitude, currentLocation.longitude)
    ) {
      setAutoCenter(true);
      setSelectedLocationName(null);
      if (searchPinMarkerRef.current) {
        searchPinMarkerRef.current.remove();
        searchPinMarkerRef.current = null;
      }
      mapInstanceRef.current.flyTo(
        [currentLocation.latitude, currentLocation.longitude],
        17,
        { duration: 0.8 }
      );
    }
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const toggleSound = () => {
    const updated = audioFeedback.toggleSound();
    setSoundEnabled(updated);
  };

  // Compute bearing from user to origin
  const startBearing =
    isTracking &&
    currentLocation &&
    startPoint &&
    isValidCoordinate(currentLocation.latitude, currentLocation.longitude) &&
    isValidCoordinate(startPoint.latitude, startPoint.longitude)
      ? calculateBearing(
          currentLocation.latitude,
          currentLocation.longitude,
          startPoint.latitude,
          startPoint.longitude
        )
      : null;

  if (engine === 'google_maps') {
    return (
      <GoogleMapsComponent
        currentLocation={currentLocation}
        routePoints={routePoints}
        startPoint={startPoint}
        territories={territories}
        isTracking={isTracking}
        isClosedLoopCandidate={isClosedLoopCandidate}
        closingThresholdMeters={closingThresholdMeters}
        highlightTerritoryId={highlightTerritoryId}
        onSelectTerritory={onSelectTerritory}
        onSwitchToOpenMap={() => setEngine('open_basemap')}
      />
    );
  }

  const currentLayerObj = FREE_MAP_LAYERS.find((l) => l.id === mapLayer) || FREE_MAP_LAYERS[0];

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden bg-[#080808]">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-full z-0" />

      {/* Tactical Canvas Overlay for Tactical Grid Mode */}
      {mapLayer === 'tactical_grid' && (
        <div className="absolute inset-0 z-10 pointer-events-none opacity-25 bg-[radial-gradient(#FF5F1F_1px,transparent_1px)] [background-size:24px_24px]" />
      )}

      {/* Active Layer Watermark Badge & Coordinates HUD (Top Left) */}
      <div className="absolute left-3 top-3 z-20 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <div className="px-2.5 py-1 rounded-lg bg-[#0F0F0F]/90 backdrop-blur-md border border-[#222222] shadow-md flex items-center gap-1.5 text-[10px] font-mono text-gray-300">
            {mapLayer === 'satellite_hd' && <Satellite className="w-3 h-3 text-[#FF5F1F]" />}
            {mapLayer === 'cyclosm' && <Footprints className="w-3 h-3 text-[#00E5FF]" />}
            {mapLayer === 'topographic' && <Mountain className="w-3 h-3 text-[#EAB308]" />}
            {mapLayer === 'cyber_dark' && <Moon className="w-3 h-3 text-[#FF5F1F]" />}
            {mapLayer === 'positron_light' && <Sun className="w-3 h-3 text-amber-400" />}
            {['osm_standard', 'humanitarian', 'voyager'].includes(mapLayer) && (
              <Globe className="w-3 h-3 text-[#10B981]" />
            )}
            <span className="font-bold text-white uppercase">{currentLayerObj.name.split(' (')[0]}</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FF5F1F]/20 text-[#FF5F1F] font-bold">
              100% FREE
            </span>
          </div>

          <button
            id="btn-open-search-modal"
            onClick={() => setShowSearchModal(true)}
            className="px-2.5 py-1 rounded-lg bg-[#0F0F0F]/90 backdrop-blur-md border border-[#222222] hover:border-[#FF5F1F]/50 shadow-md flex items-center gap-1.5 text-[10px] font-mono text-gray-300 hover:text-white cursor-pointer active:scale-95 transition-all"
            title="Search Places Worldwide (Free OSM Geocoding)"
          >
            <Search className="w-3 h-3 text-[#FF5F1F]" />
            <span className="hidden sm:inline">Search Worldwide</span>
          </button>
        </div>

        {/* Selected Search Location Dismissible Badge */}
        {selectedLocationName && (
          <div className="px-2.5 py-1 rounded-lg bg-[#FF5F1F]/90 backdrop-blur-md text-white text-[10px] font-mono font-bold flex items-center gap-2 shadow-lg pointer-events-auto max-w-[260px] truncate">
            <span className="truncate">📍 {selectedLocationName}</span>
            <button
              onClick={() => {
                setSelectedLocationName(null);
                if (searchPinMarkerRef.current) {
                  searchPinMarkerRef.current.remove();
                  searchPinMarkerRef.current = null;
                }
              }}
              className="hover:bg-black/30 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Floating Map Controls & Free Tools (Right Side) */}
      <div className="absolute right-3.5 top-16 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Layer Selector Trigger */}
        <button
          id="btn-map-layer-menu"
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          title="Free Map Layers (Satellite, Running Trails, Topo, Dark)"
          className={`w-10 h-10 rounded-xl backdrop-blur-md border flex items-center justify-center shadow-lg transition-colors active:scale-95 cursor-pointer ${
            showLayerMenu
              ? 'bg-[#FF5F1F] text-white border-[#FF5F1F]'
              : 'bg-[#0F0F0F]/90 border-[#222222] text-gray-300 hover:text-white hover:bg-[#1A1A1A]'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Free Map Tools Drawer Trigger */}
        <button
          id="btn-map-tools-drawer"
          onClick={() => setShowToolsDrawer(!showToolsDrawer)}
          title="Free Map Tools & Coordinates Inspector"
          className={`w-10 h-10 rounded-xl backdrop-blur-md border flex items-center justify-center shadow-lg transition-colors active:scale-95 cursor-pointer ${
            showToolsDrawer
              ? 'bg-[#FF5F1F] text-white border-[#FF5F1F]'
              : 'bg-[#0F0F0F]/90 border-[#222222] text-gray-300 hover:text-white hover:bg-[#1A1A1A]'
          }`}
        >
          <Compass className="w-4 h-4" />
        </button>

        {/* Territory Polygons Visibility Toggle */}
        <button
          id="btn-map-toggle-territories"
          onClick={() => setShowTerritories(!showTerritories)}
          title={showTerritories ? 'Hide Captured Sectors' : 'Show Captured Sectors'}
          className={`w-10 h-10 rounded-xl backdrop-blur-md border flex items-center justify-center shadow-lg transition-colors active:scale-95 cursor-pointer ${
            showTerritories
              ? 'bg-[#0F0F0F]/90 border-[#222222] text-[#FF5F1F]'
              : 'bg-[#1A1A1A] border-[#333333] text-gray-500'
          }`}
        >
          {showTerritories ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        {/* Recenter Camera Button */}
        <button
          id="btn-map-recenter"
          onClick={handleRecenter}
          title="Recenter to Current GPS Location"
          className={`w-10 h-10 rounded-xl backdrop-blur-md border flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer ${
            autoCenter
              ? 'bg-[#FF5F1F] text-white border-[#FF5F1F] shadow-[0_0_15px_rgba(255,95,31,0.4)]'
              : 'bg-[#0F0F0F]/90 border-[#222222] text-gray-300 hover:text-white hover:bg-[#1A1A1A]'
          }`}
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Audio Radar Toggle */}
        <button
          id="btn-map-toggle-sound"
          onClick={toggleSound}
          title={soundEnabled ? 'Mute Audio Radar' : 'Enable Audio Radar'}
          className={`w-10 h-10 rounded-xl backdrop-blur-md border flex items-center justify-center shadow-lg transition-colors active:scale-95 cursor-pointer ${
            soundEnabled
              ? 'bg-[#0F0F0F]/90 border-[#222222] text-gray-300'
              : 'bg-[#1A1A1A] border-[#333333] text-gray-600'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Zoom In */}
        <button
          id="btn-map-zoomin"
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-xl bg-[#0F0F0F]/90 backdrop-blur-md border border-[#222222] text-gray-300 hover:text-white hover:bg-[#1A1A1A] flex items-center justify-center shadow-lg transition-colors active:scale-95 cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          id="btn-map-zoomout"
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-xl bg-[#0F0F0F]/90 backdrop-blur-md border border-[#222222] text-gray-300 hover:text-white hover:bg-[#1A1A1A] flex items-center justify-center shadow-lg transition-colors active:scale-95 cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Free Map Layer Selection Flyout Menu */}
      {showLayerMenu && (
        <div className="absolute right-16 top-16 z-30 p-2.5 rounded-2xl bg-[#0F0F0F]/98 backdrop-blur-2xl border border-[#222222] shadow-2xl text-xs space-y-1.5 min-w-[240px] max-h-[80vh] overflow-y-auto pointer-events-auto">
          <div className="flex items-center justify-between px-2 py-1 border-b border-[#222222]">
            <span className="text-[10px] font-mono text-gray-400 uppercase font-black tracking-wider">
              Free Map Basemaps
            </span>
            <span className="text-[9px] font-mono text-[#FF5F1F] font-bold">8 Free Modes</span>
          </div>

          <div className="space-y-1 pt-1">
            {FREE_MAP_LAYERS.map((layer) => {
              const isSelected = mapLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => {
                    setMapLayer(layer.id);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#FF5F1F] text-white shadow-md'
                      : 'text-gray-300 hover:bg-[#1A1A1A] hover:text-white'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold font-mono text-xs">{layer.name}</span>
                      {layer.badge && (
                        <span
                          className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            isSelected
                              ? 'bg-white text-[#FF5F1F]'
                              : 'bg-[#FF5F1F]/20 text-[#FF5F1F]'
                          }`}
                        >
                          {layer.badge}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] line-clamp-1 ${
                        isSelected ? 'text-white/80' : 'text-gray-500'
                      }`}
                    >
                      {layer.description}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1.5" />}
                </button>
              );
            })}
          </div>

          <div className="pt-2 mt-1 border-t border-[#222222]">
            <button
              onClick={() => {
                setEngine('google_maps');
                setShowLayerMenu(false);
              }}
              className="w-full px-3 py-2 rounded-xl text-left font-mono text-[11px] text-[#4285F4] hover:bg-[#1A1A1A] font-bold cursor-pointer flex items-center justify-between transition-colors"
            >
              <span>Switch to Google Maps Platform</span>
              <Sparkles className="w-3.5 h-3.5 text-[#4285F4]" />
            </button>
          </div>
        </div>
      )}

      {/* Free Map Tools Drawer */}
      {showToolsDrawer && (
        <div className="absolute right-16 top-28 z-30 p-3.5 rounded-2xl bg-[#0F0F0F]/98 backdrop-blur-2xl border border-[#222222] shadow-2xl text-xs space-y-3 min-w-[260px] pointer-events-auto animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between border-b border-[#222222] pb-2">
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#FF5F1F]" />
              <span className="font-mono font-black uppercase text-white tracking-wider text-xs">
                Map Telemetry & Tools
              </span>
            </div>
            <button
              onClick={() => setShowToolsDrawer(false)}
              className="text-gray-500 hover:text-white p-1 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Coordinates HUD */}
          <div className="p-2.5 rounded-xl bg-[#141414] border border-[#222222] space-y-1 font-mono text-[11px]">
            <span className="text-[9px] text-gray-500 uppercase font-bold block">Camera Center</span>
            <div className="flex justify-between text-gray-300">
              <span className="text-gray-500">Latitude:</span>
              <span className="text-white font-bold">{centerCoords.lat.toFixed(6)}°</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span className="text-gray-500">Longitude:</span>
              <span className="text-white font-bold">{centerCoords.lng.toFixed(6)}°</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span className="text-gray-500">Zoom Level:</span>
              <span className="text-[#FF5F1F] font-bold">{centerCoords.zoom}x</span>
            </div>
          </div>

          {/* Layer Legend Quick Info */}
          <div className="p-2.5 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5">
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-gray-400 uppercase">
              <Info className="w-3 h-3 text-[#FF5F1F]" />
              <span>Layer Feature Guide</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed font-mono">
              {mapLayer === 'satellite_hd' &&
                'High-res ESRI orbital imagery without watermarks or quota limits.'}
              {mapLayer === 'cyclosm' &&
                'Dedicated track paths, pedestrian walkways, elevation relief, and running surfaces.'}
              {mapLayer === 'topographic' &&
                'OpenTopoMap elevation contour lines with mountain terrain shading.'}
              {mapLayer === 'cyber_dark' &&
                'Optimized Carto Dark Matter basemap for high-contrast neon GPS lines.'}
              {['osm_standard', 'humanitarian', 'voyager', 'positron_light', 'tactical_grid'].includes(
                mapLayer
              ) && 'Free vector/raster tile basemap powered by open-source geo data.'}
            </p>
          </div>

          <button
            onClick={() => {
              setShowToolsDrawer(false);
              setShowSearchModal(true);
            }}
            className="w-full py-2 px-3 rounded-xl bg-[#FF5F1F] hover:bg-[#FF7A3D] text-white font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search World Running Spots</span>
          </button>
        </div>
      )}

      {/* Free Nominatim Search Location Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-[#0F0F0F] border border-[#262626] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FF5F1F]/20 text-[#FF5F1F] flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-mono uppercase text-white tracking-wider">
                    Free Worldwide Map Search
                  </h3>
                  <span className="text-[10px] font-mono text-gray-500">
                    OpenStreetMap Nominatim Geocoder (100% Free)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="w-8 h-8 rounded-full bg-[#1A1A1A] hover:bg-[#222222] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, park, trail (e.g. Central Park, Shibuya, Hyde Park)..."
                className="w-full h-11 pl-10 pr-20 rounded-xl bg-[#181818] border border-[#333333] focus:border-[#FF5F1F] text-white text-xs font-mono placeholder:text-gray-600 focus:outline-none transition-colors"
                autoFocus
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-2 top-1.5 h-8 px-3 rounded-lg bg-[#FF5F1F] hover:bg-[#FF7A3D] disabled:opacity-50 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
              </button>
            </form>

            {/* Dynamic Results */}
            {searchResults.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                <span className="text-[10px] font-mono text-gray-500 uppercase px-1">
                  Search Results ({searchResults.length})
                </span>
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    onClick={() =>
                      handleSelectLocation(
                        parseFloat(result.lat),
                        parseFloat(result.lon),
                        result.display_name
                      )
                    }
                    className="w-full p-2.5 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#222222] hover:border-[#FF5F1F]/40 text-left transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <MapPin className="w-3.5 h-3.5 text-[#FF5F1F] shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-mono font-bold text-white truncate">
                          {result.name || result.display_name.split(',')[0]}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500 truncate">
                          {result.display_name}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-[#FF5F1F] font-bold px-2 py-0.5 rounded bg-[#FF5F1F]/10 shrink-0">
                      Fly Here
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Preset Iconic World Running Spots */}
            <div className="space-y-2 pt-2 border-t border-[#222222]">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase font-black">
                  Iconic Running Spots
                </span>
                <span className="text-[9px] font-mono text-[#FF5F1F]">Instant Fly-To</span>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                {POPULAR_RUNNING_SPOTS.map((spot, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectLocation(spot.lat, spot.lon, spot.name)}
                    className="p-2.5 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#222222] hover:border-[#FF5F1F]/40 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-white group-hover:text-[#FF5F1F] transition-colors truncate">
                        {spot.name.split(',')[0]}
                      </span>
                      <span className="text-[8px] font-mono text-gray-500 uppercase">{spot.tag}</span>
                    </div>
                    <span className="text-[9px] font-mono text-gray-500 mt-0.5 block">
                      {spot.country}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Point Compass Bearing Radar (Visible when actively running) */}
      {isTracking && startBearing !== null && (
        <div className="absolute left-3.5 top-16 z-20 pointer-events-auto">
          <div className="p-2.5 rounded-2xl bg-[#0F0F0F]/95 backdrop-blur-md border border-[#222222] shadow-xl flex flex-col items-center gap-1 min-w-[68px]">
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tight">Origin</span>
            <div
              className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-[#333333] flex items-center justify-center transition-transform duration-300"
              style={{ transform: `rotate(${startBearing}deg)` }}
            >
              <Navigation className="w-3.5 h-3.5 fill-[#FF5F1F] text-[#FF5F1F]" />
            </div>
            <span className="text-[10px] font-mono font-bold text-white">
              {getCardinalDirection(startBearing)}
            </span>
          </div>
        </div>
      )}

      {/* Loop Proximity Alert Banner */}
      {isTracking && isClosedLoopCandidate && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-[#FF5F1F] text-white text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_25px_rgba(255,95,31,0.6)] flex items-center gap-2 animate-bounce pointer-events-none">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
          <span>LOOP CLOSED • TAP FINISH TO CLAIM SECTOR</span>
        </div>
      )}

      {/* Interactive Selected Territory Inspector Card */}
      {selectedTerritoryDetails && (
        <div className="absolute bottom-28 left-4 right-4 z-40 p-4 rounded-2xl bg-[#0F0F0F]/95 backdrop-blur-xl border border-[#222222] shadow-2xl text-[#F5F5F5] pointer-events-auto animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-4 h-4 rounded-md shrink-0 shadow-sm"
                style={{ backgroundColor: selectedTerritoryDetails.color || '#FF5F1F' }}
              />
              <div>
                <h4 className="text-sm font-bold uppercase tracking-tight text-white leading-none">
                  {selectedTerritoryDetails.name}
                </h4>
                <span className="text-[10px] text-gray-500 font-mono mt-1 block">
                  Captured on {new Date(selectedTerritoryDetails.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTerritoryDetails(null)}
              className="text-gray-500 hover:text-white text-xs font-mono px-2 py-0.5 rounded-md hover:bg-[#1A1A1A] cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#222222]">
            <div className="p-2.5 rounded-xl bg-[#121212] border border-[#222222] text-center">
              <span className="text-[10px] font-mono text-gray-500 uppercase">Sector Area</span>
              <div className="text-sm font-bold font-mono text-[#FF5F1F] mt-0.5">
                {formatArea(selectedTerritoryDetails.areaMeters)}
              </div>
              <span className="text-[9px] font-mono text-gray-500">
                {formatAreaAcres(selectedTerritoryDetails.areaMeters)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#121212] border border-[#222222] text-center">
              <span className="text-[10px] font-mono text-gray-500 uppercase">Domain Status</span>
              <div className="text-sm font-bold font-mono text-white mt-0.5 flex items-center justify-center gap-1">
                <Shield className="w-3.5 h-3.5 text-[#FF5F1F]" />
                <span>SECURED</span>
              </div>
              <span className="text-[9px] font-mono text-gray-500">Sovereign Domain</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
