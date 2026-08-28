import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

// Tracking attribution required by Google Maps Platform guidelines
export const GMP_ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

// Cyber Dark Google Maps Theme JSON
export const GOOGLE_MAPS_DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#171717' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#171717' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#121d14' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#262626' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8a8a8a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#333333' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f1f1f' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f39c12' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#091522' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

let isInitialized = false;

export async function loadGoogleMapsSDK(apiKey?: string): Promise<typeof google.maps> {
  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey || trimmedKey.length < 5) {
    throw new Error('Google Maps API key is required. Please provide an API key or use Open Basemaps.');
  }

  if (!isInitialized) {
    setOptions({
      key: trimmedKey,
      v: 'weekly',
    });
    isInitialized = true;
  }

  await importLibrary('maps');
  await importLibrary('geometry');
  return window.google.maps;
}
