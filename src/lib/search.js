const NYC_BBOX = '-74.257159,40.496010,-73.699215,40.915568';

export function generateSessionToken() {
  return crypto.randomUUID();
}

export async function suggestAddresses(query, token, sessionToken) {
  if (!query || query.length < 3) return [];

  const url = new URL('https://api.mapbox.com/search/searchbox/v1/suggest');
  url.searchParams.set('q', query);
  url.searchParams.set('bbox', NYC_BBOX);
  url.searchParams.set('limit', '5');
  url.searchParams.set('types', 'address');
  url.searchParams.set('session_token', sessionToken);
  url.searchParams.set('access_token', token);

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.suggestions || []).map((s) => ({
    mapboxId: s.mapbox_id,
    name: s.name,
    fullAddress: s.full_address || s.place_formatted || s.name,
  }));
}

export async function retrieveAddress(mapboxId, token, sessionToken) {
  const url = new URL(`https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}`);
  url.searchParams.set('session_token', sessionToken);
  url.searchParams.set('access_token', token);

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to retrieve address details');

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) throw new Error('Address details not found');

  const [lng, lat] = feature.geometry.coordinates;
  return {
    lng,
    lat,
    formattedAddress: feature.properties.full_address || feature.properties.name,
  };
}

export async function reverseGeocode(lng, lat, token) {
  const url = new URL('https://api.mapbox.com/search/geocode/v6/reverse');
  url.searchParams.set('longitude', lng.toString());
  url.searchParams.set('latitude', lat.toString());
  url.searchParams.set('types', 'address');
  url.searchParams.set('limit', '1');
  url.searchParams.set('access_token', token);

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  return {
    lng: feature.geometry.coordinates[0],
    lat: feature.geometry.coordinates[1],
    formattedAddress: feature.properties.full_address || `${lng.toFixed(5)}, ${lat.toFixed(5)}`,
  };
}
