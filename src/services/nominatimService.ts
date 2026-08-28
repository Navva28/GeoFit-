export interface NominatimSearchResult {
  place_id: number;
  osm_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  type: string;
  importance?: number;
}

export const POPULAR_RUNNING_SPOTS = [
  { name: 'Central Park, New York', lat: 40.785091, lon: -73.968285, country: 'USA', tag: 'Park Loop' },
  { name: 'Shibuya & Yoyogi, Tokyo', lat: 35.6672, lon: 139.6998, country: 'Japan', tag: 'Urban Trail' },
  { name: 'Hyde Park, London', lat: 51.507268, lon: -0.165730, country: 'UK', tag: 'Royal Park' },
  { name: 'Marina Bay, Singapore', lat: 1.2847, lon: 103.8610, country: 'Singapore', tag: 'Waterfront' },
  { name: 'Golden Gate Park, SF', lat: 37.7694, lon: -122.4862, country: 'USA', tag: 'Coastal Trail' },
  { name: 'Tiergarten, Berlin', lat: 52.5145, lon: 13.3501, country: 'Germany', tag: 'Forest Track' },
  { name: 'Jardin du Luxembourg, Paris', lat: 48.8462, lon: 2.3371, country: 'France', tag: 'City Loop' },
  { name: 'Sydney Harbour, Sydney', lat: -33.8568, lon: 151.2153, country: 'Australia', tag: 'Harbour Run' },
];

/**
 * Free geocoding search using OpenStreetMap's public Nominatim API
 */
export async function searchNominatimLocations(query: string): Promise<NominatimSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}&limit=6&addressdetails=1`;

    const res = await fetch(endpoint, {
      headers: {
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) {
      throw new Error(`Nominatim search error: ${res.status}`);
    }

    const data: NominatimSearchResult[] = await res.json();
    return data;
  } catch (err) {
    console.warn('Geocoding search warning:', err);
    // Filter popular spots as local fallback
    return POPULAR_RUNNING_SPOTS.filter(spot =>
      spot.name.toLowerCase().includes(trimmed.toLowerCase())
    ).map((spot, idx) => ({
      place_id: 999000 + idx,
      osm_id: 999000 + idx,
      display_name: spot.name,
      name: spot.name,
      lat: String(spot.lat),
      lon: String(spot.lon),
      type: 'preset',
    }));
  }
}
