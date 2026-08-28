import React, { useEffect, useRef, useState } from 'react';
import { GpsPoint, Territory } from '../types';
import { Layers, Crosshair, ZoomIn, ZoomOut, Eye, EyeOff, Volume2, VolumeX, Shield, Navigation, Key, ExternalLink, AlertCircle } from 'lucide-react';
import { formatArea, formatAreaAcres, calculateBearing, getCardinalDirection, calculatePolygonCentroid, isValidCoordinate } from '../utils/geoEngine';
import { audioFeedback } from '../utils/audioFeedback';
import { loadGoogleMapsSDK, GOOGLE_MAPS_DARK_STYLE, GMP_ATTRIBUTION_ID } from '../utils/googleMapsConfig';
import { storageService } from '../services/storageService';

interface GoogleMapsComponentProps {
  currentLocation: GpsPoint | null;
  routePoints: GpsPoint[];
  startPoint: GpsPoint | null;
  territories: Territory[];
  isTracking: boolean;
  isClosedLoopCandidate: boolean;
  closingThresholdMeters?: number;
  highlightTerritoryId?: string | null;
  onSelectTerritory?: (territory: Territory) => void;
  onSwitchToOpenMap?: () => void;
}

type GoogleMapType = 'dark_vector' | 'satellite' | 'hybrid' | 'roadmap' | 'terrain';

export const GoogleMapsComponent: React.FC<GoogleMapsComponentProps> = ({
  currentLocation,
  routePoints,
  startPoint,
  territories,
  isTracking,
  isClosedLoopCandidate,
  closingThresholdMeters = 22,
  highlightTerritoryId,
  onSelectTerritory,
  onSwitchToOpenMap,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Overlay references
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const startMarkerRef = useRef<google.maps.Marker | null>(null);
  const startRadiusCircleRef = useRef<google.maps.Circle | null>(null);
  const livePolylineRef = useRef<google.maps.Polyline | null>(null);
  const prospectivePolygonRef = useRef<google.maps.Polygon | null>(null);
  const closingDashlineRef = useRef<google.maps.Polyline | null>(null);
  const territoryPolygonsRef = useRef<Map<string, google.maps.Polygon>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [mapType, setMapType] = useState<GoogleMapType>('dark_vector');
  const [autoCenter, setAutoCenter] = useState<boolean>(true);
  const [showTerritories, setShowTerritories] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(audioFeedback.isSoundEnabled());
  const [selectedTerritoryDetails, setSelectedTerritoryDetails] = useState<Territory | null>(null);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(storageService.getGoogleMapsApiKey());

  const prevCandidateRef = useRef<boolean>(false);

  // Audio feedback when loop closes
  useEffect(() => {
    if (isClosedLoopCandidate && !prevCandidateRef.current) {
      audioFeedback.playLoopClosedSuccess();
    }
    prevCandidateRef.current = isClosedLoopCandidate;
  }, [isClosedLoopCandidate]);

  // Initialize Google Maps SDK
  useEffect(() => {
    let isMounted = true;
    const currentKey = storageService.getGoogleMapsApiKey() || ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) || '';

    // Register global auth failure callback for Google Maps
    (window as any).gm_authFailure = () => {
      if (isMounted) {
        setLoadError('Google Maps API authentication failed: The API key is invalid, restricted, or not enabled.');
      }
    };

    if (!currentKey || currentKey.trim().length < 5) {
      setLoadError('Google Maps API key is missing or unconfigured. Mint a free Maps Demo Key or switch to Open Basemaps.');
      return;
    }

    loadGoogleMapsSDK(currentKey)
      .then((gMaps) => {
        if (!isMounted || !mapContainerRef.current) return;

        const defaultCenter =
          currentLocation && isValidCoordinate(currentLocation.latitude, currentLocation.longitude)
            ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
            : { lat: 37.7749, lng: -122.4194 };

        const map = new gMaps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 16,
          styles: mapType === 'dark_vector' ? GOOGLE_MAPS_DARK_STYLE : undefined,
          mapTypeId: mapType === 'dark_vector' ? gMaps.MapTypeId.ROADMAP : (mapType as google.maps.MapTypeId),
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          backgroundColor: '#080808',
        });

        // Set tracking attribution
        (map as any).internalUsageAttributionIds = [GMP_ATTRIBUTION_ID];

        infoWindowRef.current = new gMaps.InfoWindow();

        map.addListener('dragstart', () => {
          setAutoCenter(false);
        });

        mapInstanceRef.current = map;
        setIsLoaded(true);
        setLoadError(null);
      })
      .catch((err) => {
        console.warn('Google Maps SDK load notice:', err);
        if (isMounted) {
          setLoadError(err.message || 'Google Maps SDK requires an API key');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update map type / theme
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;
    const map = mapInstanceRef.current;

    if (mapType === 'dark_vector') {
      map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
      map.setOptions({ styles: GOOGLE_MAPS_DARK_STYLE });
    } else if (mapType === 'satellite') {
      map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
      map.setOptions({ styles: [] });
    } else if (mapType === 'hybrid') {
      map.setMapTypeId(google.maps.MapTypeId.HYBRID);
      map.setOptions({ styles: [] });
    } else if (mapType === 'terrain') {
      map.setMapTypeId(google.maps.MapTypeId.TERRAIN);
      map.setOptions({ styles: [] });
    } else {
      map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
      map.setOptions({ styles: [] });
    }
  }, [mapType]);

  // Update User Marker & Accuracy Circle
  useEffect(() => {
    if (
      !mapInstanceRef.current ||
      !window.google ||
      !currentLocation ||
      !isValidCoordinate(currentLocation.latitude, currentLocation.longitude)
    ) {
      return;
    }
    const map = mapInstanceRef.current;
    const pos = { lat: currentLocation.latitude, lng: currentLocation.longitude };

    // Accuracy Circle
    const rawAccuracy = currentLocation.accuracy;
    const accuracy = typeof rawAccuracy === 'number' && Number.isFinite(rawAccuracy) && rawAccuracy > 0 ? rawAccuracy : 12;
    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = new google.maps.Circle({
        map,
        center: pos,
        radius: Math.min(accuracy, 60),
        fillColor: '#FF5F1F',
        fillOpacity: 0.15,
        strokeColor: '#FF5F1F',
        strokeOpacity: 0.5,
        strokeWeight: 1,
        zIndex: 5,
      });
    } else {
      accuracyCircleRef.current.setCenter(pos);
      accuracyCircleRef.current.setRadius(Math.min(accuracy, 60));
    }

    // User GPS Beacon
    if (!userMarkerRef.current) {
      userMarkerRef.current = new google.maps.Marker({
        position: pos,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#FF5F1F',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2.5,
        },
        zIndex: 1000,
        title: 'Current Position',
      });
    } else {
      userMarkerRef.current.setPosition(pos);
    }

    if (autoCenter) {
      map.panTo(pos);
    }
  }, [currentLocation, autoCenter]);

  // Update Start Point Marker & Proximity Circle
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;
    const map = mapInstanceRef.current;

    if (startPoint && isTracking && isValidCoordinate(startPoint.latitude, startPoint.longitude)) {
      const pos = { lat: startPoint.latitude, lng: startPoint.longitude };

      if (!startMarkerRef.current) {
        startMarkerRef.current = new google.maps.Marker({
          position: pos,
          map,
          label: {
            text: 'S',
            color: '#FFFFFF',
            fontWeight: 'bold',
            fontSize: '11px',
            fontFamily: 'monospace',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: '#000000',
            fillOpacity: 0.85,
            strokeColor: '#FF5F1F',
            strokeWeight: 2,
          },
          zIndex: 900,
        });
      } else {
        startMarkerRef.current.setPosition(pos);
      }

      // Proximity ring
      const safeRadius = Number.isFinite(closingThresholdMeters) && closingThresholdMeters > 0 ? closingThresholdMeters : 22;
      if (!startRadiusCircleRef.current) {
        startRadiusCircleRef.current = new google.maps.Circle({
          map,
          center: pos,
          radius: safeRadius,
          fillColor: '#FF5F1F',
          fillOpacity: isClosedLoopCandidate ? 0.35 : 0.15,
          strokeColor: '#FF5F1F',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          zIndex: 10,
        });
      } else {
        startRadiusCircleRef.current.setCenter(pos);
        startRadiusCircleRef.current.setRadius(safeRadius);
        startRadiusCircleRef.current.setOptions({
          fillOpacity: isClosedLoopCandidate ? 0.35 : 0.15,
        });
      }
    } else {
      if (startMarkerRef.current) {
        startMarkerRef.current.setMap(null);
        startMarkerRef.current = null;
      }
      if (startRadiusCircleRef.current) {
        startRadiusCircleRef.current.setMap(null);
        startRadiusCircleRef.current = null;
      }
    }
  }, [startPoint, isTracking, isClosedLoopCandidate, closingThresholdMeters]);

  // Update Live Route Polyline & Prospective Polygon
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;
    const map = mapInstanceRef.current;

    const validRoute = routePoints.filter(
      (p) => p && isValidCoordinate(p.latitude, p.longitude)
    );

    if (validRoute.length >= 2) {
      const path = validRoute.map((p) => ({ lat: p.latitude, lng: p.longitude }));

      // 1. Live Running Polyline
      if (!livePolylineRef.current) {
        livePolylineRef.current = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#FF5F1F',
          strokeOpacity: 1.0,
          strokeWeight: 4,
          map,
          zIndex: 50,
        });
      } else {
        livePolylineRef.current.setPath(path);
      }

      // 2. Prospective Polygon fill
      const hasValidStart = startPoint && isValidCoordinate(startPoint.latitude, startPoint.longitude);
      if (isTracking && validRoute.length >= 3 && hasValidStart) {
        const polyCoords = [...path, { lat: startPoint.latitude, lng: startPoint.longitude }];

        if (!prospectivePolygonRef.current) {
          prospectivePolygonRef.current = new google.maps.Polygon({
            paths: polyCoords,
            strokeColor: '#FF5F1F',
            strokeOpacity: 0.8,
            strokeWeight: 1.5,
            fillColor: '#FF5F1F',
            fillOpacity: isClosedLoopCandidate ? 0.45 : 0.2,
            map,
            zIndex: 20,
          });
        } else {
          prospectivePolygonRef.current.setPaths(polyCoords);
          prospectivePolygonRef.current.setOptions({
            fillOpacity: isClosedLoopCandidate ? 0.45 : 0.2,
          });
        }
      } else if (prospectivePolygonRef.current) {
        prospectivePolygonRef.current.setMap(null);
        prospectivePolygonRef.current = null;
      }

      // 3. Laser Dash Line connecting to origin
      const hasValidCur = currentLocation && isValidCoordinate(currentLocation.latitude, currentLocation.longitude);
      if (hasValidStart && hasValidCur && isTracking) {
        const dashPath = [
          { lat: currentLocation.latitude, lng: currentLocation.longitude },
          { lat: startPoint.latitude, lng: startPoint.longitude },
        ];

        const lineSymbol = {
          path: 'M 0,-1 0,1',
          strokeOpacity: 1,
          scale: 3,
        };

        if (!closingDashlineRef.current) {
          closingDashlineRef.current = new google.maps.Polyline({
            path: dashPath,
            strokeOpacity: 0,
            icons: [
              {
                icon: lineSymbol,
                offset: '0',
                repeat: '12px',
              },
            ],
            strokeColor: isClosedLoopCandidate ? '#FFFFFF' : '#FF5F1F',
            map,
            zIndex: 60,
          });
        } else {
          closingDashlineRef.current.setPath(dashPath);
          closingDashlineRef.current.setOptions({
            strokeColor: isClosedLoopCandidate ? '#FFFFFF' : '#FF5F1F',
          });
        }
      } else if (closingDashlineRef.current) {
        closingDashlineRef.current.setMap(null);
        closingDashlineRef.current = null;
      }
    } else {
      if (livePolylineRef.current) {
        livePolylineRef.current.setMap(null);
        livePolylineRef.current = null;
      }
      if (prospectivePolygonRef.current) {
        prospectivePolygonRef.current.setMap(null);
        prospectivePolygonRef.current = null;
      }
      if (closingDashlineRef.current) {
        closingDashlineRef.current.setMap(null);
        closingDashlineRef.current = null;
      }
    }
  }, [routePoints, isClosedLoopCandidate, startPoint, currentLocation, isTracking]);

  // Render Captured Territory Polygons
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;
    const map = mapInstanceRef.current;
    const polyMap = territoryPolygonsRef.current;

    if (!showTerritories) {
      polyMap.forEach((p) => p.setMap(null));
      polyMap.clear();
      return;
    }

    const territoryIds = new Set(territories.map((t) => t.territoryId));
    polyMap.forEach((p, id) => {
      if (!territoryIds.has(id)) {
        p.setMap(null);
        polyMap.delete(id);
      }
    });

    territories.forEach((territory) => {
      const validPoints = (territory.points || []).filter(
        (p) => p && isValidCoordinate(p.latitude, p.longitude)
      );
      if (validPoints.length < 3) return;

      const coords = validPoints.map((p) => ({ lat: p.latitude, lng: p.longitude }));
      const isHighlighted = highlightTerritoryId === territory.territoryId;
      const polyColor = territory.color || '#FF5F1F';

      if (!polyMap.has(territory.territoryId)) {
        const polygon = new google.maps.Polygon({
          paths: coords,
          strokeColor: polyColor,
          strokeOpacity: 1.0,
          strokeWeight: isHighlighted ? 3.5 : 2,
          fillColor: polyColor,
          fillOpacity: isHighlighted ? 0.5 : 0.3,
          map,
          zIndex: isHighlighted ? 40 : 30,
        });

        polygon.addListener('click', () => {
          setSelectedTerritoryDetails(territory);
          if (onSelectTerritory) {
            onSelectTerritory(territory);
          }
          const bounds = new google.maps.LatLngBounds();
          coords.forEach((c) => bounds.extend(c));
          map.fitBounds(bounds, 50);
        });

        polyMap.set(territory.territoryId, polygon);
      } else {
        const existing = polyMap.get(territory.territoryId);
        if (existing) {
          existing.setPaths(coords);
          existing.setOptions({
            strokeColor: polyColor,
            strokeWeight: isHighlighted ? 3.5 : 2,
            fillOpacity: isHighlighted ? 0.5 : 0.3,
          });
        }
      }
    });
  }, [territories, highlightTerritoryId, showTerritories, onSelectTerritory]);

  const handleRecenter = () => {
    if (
      mapInstanceRef.current &&
      currentLocation &&
      isValidCoordinate(currentLocation.latitude, currentLocation.longitude)
    ) {
      setAutoCenter(true);
      mapInstanceRef.current.panTo({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
      });
      mapInstanceRef.current.setZoom(17);
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 16) + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 16) - 1);
    }
  };

  const handleSaveApiKey = () => {
    storageService.setGoogleMapsApiKey(apiKeyInput);
    setShowKeyModal(false);
    window.location.reload();
  };

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

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden bg-[#080808]">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-full z-0" />

      {/* Error or API Key Notice Overlay */}
      {loadError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#080808]/90 backdrop-blur-md">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#121212] border border-[#222222] shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white font-mono">Google Maps Platform SDK</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{loadError}</p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                id="btn-google-maps-setup-key"
                onClick={() => setShowKeyModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#4285F4] hover:bg-[#3367D6] text-white font-mono text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Key className="w-4 h-4" />
                Configure Google Maps Key
              </button>

              {onSwitchToOpenMap && (
                <button
                  id="btn-switch-open-basemaps"
                  onClick={onSwitchToOpenMap}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1A1A1A] hover:bg-[#262626] border border-[#333333] text-gray-200 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Shield className="w-4 h-4 text-[#FF5F1F]" />
                  Switch to Zero-Key Open Basemaps
                </button>
              )}
            </div>

            <p className="text-[10px] text-gray-500 font-mono pt-1">
              Open Basemaps requires no key and works instantly offline/online.
            </p>
          </div>
        </div>
      )}

      {/* Google Maps SDK Badge */}
      <div className="absolute left-3.5 bottom-20 z-20 pointer-events-auto">
        <div className="px-2.5 py-1 rounded-md bg-[#0F0F0F]/80 backdrop-blur-md border border-[#222222] text-[10px] font-mono text-gray-400 flex items-center gap-1.5 shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
          <span>Google Maps Platform SDK</span>
        </div>
      </div>

      {/* Floating Controls (Right Side) */}
      <div className="absolute right-3.5 top-20 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Layer Selector Trigger */}
        <button
          id="btn-google-map-layer-menu"
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          title="Select Map Type"
          className={`w-10 h-10 rounded-xl backdrop-blur-md border flex items-center justify-center shadow-lg transition-colors active:scale-95 cursor-pointer ${
            showLayerMenu
              ? 'bg-[#FF5F1F] text-white border-[#FF5F1F]'
              : 'bg-[#0F0F0F]/90 border-[#222222] text-gray-300 hover:text-white hover:bg-[#1A1A1A]'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Territory Polygons Visibility Toggle */}
        <button
          id="btn-google-map-toggle-territories"
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
          id="btn-google-map-recenter"
          onClick={handleRecenter}
          title="Recenter to Current Location"
          className={`w-10 h-10 rounded-xl backdrop-blur-md border flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer ${
            autoCenter
              ? 'bg-[#FF5F1F] text-white border-[#FF5F1F] shadow-[0_0_15px_rgba(255,95,31,0.4)]'
              : 'bg-[#0F0F0F]/90 border-[#222222] text-gray-300 hover:text-white hover:bg-[#1A1A1A]'
          }`}
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Zoom In */}
        <button
          id="btn-google-map-zoomin"
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-xl bg-[#0F0F0F]/90 backdrop-blur-md border border-[#222222] text-gray-300 hover:text-white hover:bg-[#1A1A1A] flex items-center justify-center shadow-lg transition-colors active:scale-95 cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          id="btn-google-map-zoomout"
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-xl bg-[#0F0F0F]/90 backdrop-blur-md border border-[#222222] text-gray-300 hover:text-white hover:bg-[#1A1A1A] flex items-center justify-center shadow-lg transition-colors active:scale-95 cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Configure API Key */}
        <button
          id="btn-google-map-config-key"
          onClick={() => setShowKeyModal(true)}
          title="Google Maps API Key Setup"
          className="w-10 h-10 rounded-xl bg-[#0F0F0F]/90 backdrop-blur-md border border-[#222222] text-gray-400 hover:text-white hover:bg-[#1A1A1A] flex items-center justify-center shadow-lg transition-colors active:scale-95 cursor-pointer"
        >
          <Key className="w-4 h-4" />
        </button>
      </div>

      {/* Layer Selection Flyout Menu */}
      {showLayerMenu && (
        <div className="absolute right-16 top-20 z-30 p-2 rounded-2xl bg-[#0F0F0F]/95 backdrop-blur-xl border border-[#222222] shadow-2xl text-xs space-y-1 min-w-[170px] pointer-events-auto">
          <span className="text-[10px] font-mono text-gray-500 uppercase px-2 py-1 block">Google Maps Modes</span>

          <button
            onClick={() => { setMapType('dark_vector'); setShowLayerMenu(false); }}
            className={`w-full px-2.5 py-1.5 rounded-lg text-left font-mono font-bold flex items-center justify-between cursor-pointer transition-colors ${
              mapType === 'dark_vector' ? 'bg-[#FF5F1F] text-white' : 'text-gray-300 hover:bg-[#1A1A1A]'
            }`}
          >
            <span>Cyber Dark</span>
            {mapType === 'dark_vector' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>

          <button
            onClick={() => { setMapType('satellite'); setShowLayerMenu(false); }}
            className={`w-full px-2.5 py-1.5 rounded-lg text-left font-mono font-bold flex items-center justify-between cursor-pointer transition-colors ${
              mapType === 'satellite' ? 'bg-[#FF5F1F] text-white' : 'text-gray-300 hover:bg-[#1A1A1A]'
            }`}
          >
            <span>Satellite</span>
            {mapType === 'satellite' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>

          <button
            onClick={() => { setMapType('hybrid'); setShowLayerMenu(false); }}
            className={`w-full px-2.5 py-1.5 rounded-lg text-left font-mono font-bold flex items-center justify-between cursor-pointer transition-colors ${
              mapType === 'hybrid' ? 'bg-[#FF5F1F] text-white' : 'text-gray-300 hover:bg-[#1A1A1A]'
            }`}
          >
            <span>Hybrid</span>
            {mapType === 'hybrid' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>

          <button
            onClick={() => { setMapType('terrain'); setShowLayerMenu(false); }}
            className={`w-full px-2.5 py-1.5 rounded-lg text-left font-mono font-bold flex items-center justify-between cursor-pointer transition-colors ${
              mapType === 'terrain' ? 'bg-[#FF5F1F] text-white' : 'text-gray-300 hover:bg-[#1A1A1A]'
            }`}
          >
            <span>Terrain</span>
            {mapType === 'terrain' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>

          <button
            onClick={() => { setMapType('roadmap'); setShowLayerMenu(false); }}
            className={`w-full px-2.5 py-1.5 rounded-lg text-left font-mono font-bold flex items-center justify-between cursor-pointer transition-colors ${
              mapType === 'roadmap' ? 'bg-[#FF5F1F] text-white' : 'text-gray-300 hover:bg-[#1A1A1A]'
            }`}
          >
            <span>Roadmap</span>
            {mapType === 'roadmap' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>

          {onSwitchToOpenMap && (
            <div className="pt-1 mt-1 border-t border-[#222222]">
              <button
                onClick={() => { onSwitchToOpenMap(); setShowLayerMenu(false); }}
                className="w-full px-2.5 py-1.5 rounded-lg text-left font-mono text-[11px] text-[#FF5F1F] hover:bg-[#1A1A1A] font-bold cursor-pointer"
              >
                Switch to Open Basemaps
              </button>
            </div>
          )}
        </div>
      )}

      {/* Start Point Compass Bearing */}
      {isTracking && startBearing !== null && (
        <div className="absolute left-3.5 top-20 z-20 pointer-events-auto">
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

      {/* Selected Territory Inspector */}
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

      {/* Google Maps API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
          <div className="w-full max-w-sm rounded-2xl bg-[#0F0F0F] border border-[#222222] p-5 shadow-2xl text-[#F5F5F5] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#FF5F1F]" />
                <h3 className="font-bold text-xs uppercase font-mono tracking-wider text-white">Google Maps SDK Key</h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-xs text-gray-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400 font-mono">
              Provide your Google Cloud API key or use the free Maps Demo Key for prototyping.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#333333] text-white font-mono text-xs focus:outline-none focus:border-[#FF5F1F]"
              />

              <div className="pt-1">
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#4285F4] hover:underline flex items-center gap-1 font-mono"
                >
                  <span>Mint free Maps Demo Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#222222] border border-[#333333] text-gray-300 text-xs font-mono font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="flex-1 py-2.5 rounded-xl bg-[#FF5F1F] hover:bg-[#FF5F1F]/90 text-white text-xs font-mono font-bold cursor-pointer"
              >
                Save & Load
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
