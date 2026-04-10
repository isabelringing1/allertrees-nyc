import { countTreesAlongRoute, findTreesAlongRoute, findDensestSegment, countTreesNearPoint, generateRadialWaypoints, hasSignificantBacktracking } from './spatialIndex';

const NYC_BBOX = [-74.257159, 40.496010, -73.699215, 40.915568];

export async function geocodeAddress(address, token) {
  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
  url.searchParams.set('q', address);
  url.searchParams.set('bbox', NYC_BBOX.join(','));
  url.searchParams.set('limit', '1');
  url.searchParams.set('types', 'address');
  url.searchParams.set('access_token', token);

  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding request failed');

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) {
    throw new Error(`Address not found in NYC: "${address}"`);
  }

  const [lng, lat] = feature.geometry.coordinates;
  if (lng < NYC_BBOX[0] || lng > NYC_BBOX[2] || lat < NYC_BBOX[1] || lat > NYC_BBOX[3]) {
    throw new Error(`Address is outside NYC: "${address}"`);
  }

  return {
    lng,
    lat,
    formattedAddress: feature.properties.full_address || address,
  };
}

export async function getWalkingRoutes(start, end, token) {
  const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?alternatives=true&geometries=geojson&overview=full&exclude=ferry&access_token=${token}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Directions request failed');

  const data = await res.json();
  if (!data.routes?.length) throw new Error('No walking-only route found between these addresses (ferries excluded)');

  return data.routes.map((r) => ({
    geometry: r.geometry,
    duration: r.duration,
    distance: r.distance,
  }));
}

async function getRouteViaWaypoint(start, waypoint, end, token) {
  const coords = `${start.lng},${start.lat};${waypoint[0]},${waypoint[1]};${end.lng},${end.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?geometries=geojson&overview=full&exclude=ferry&access_token=${token}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.routes?.length) return null;

  const r = data.routes[0];
  return { geometry: r.geometry, duration: r.duration, distance: r.distance };
}

export async function findBestRoute(start, end, token, treeIndex, maxDetourSeconds) {
  // Step 1: Get standard routes with alternatives
  const routes = await getWalkingRoutes(start, end, token);

  const shortest = routes.reduce((a, b) => (a.duration < b.duration ? a : b));
  const maxDuration = shortest.duration + maxDetourSeconds;

  // Score all routes within budget
  let candidates = routes
    .filter((r) => r.duration <= maxDuration)
    .map((r) => ({
      ...r,
      treeCount: countTreesAlongRoute(treeIndex, r.geometry.coordinates),
    }));

  // Filter out routes with significant backtracking (always keep shortest as fallback)
  candidates = candidates.filter(
    (c) => !hasSignificantBacktracking(c.geometry.coordinates)
  );
  if (candidates.length === 0) {
    candidates = [{
      ...shortest,
      treeCount: countTreesAlongRoute(treeIndex, shortest.geometry.coordinates),
    }];
  }

  // Step 2: Try waypoint-based avoidance routes
  const bestSoFar = candidates.reduce(
    (best, c) => (c.treeCount < best.treeCount ? c : best),
    candidates[0]
  );

  if (bestSoFar && bestSoFar.treeCount > 0) {
    const coords = bestSoFar.geometry.coordinates;

    // Generate waypoints in all directions (8 compass points) around key locations
    const distances = [100, 200];
    let waypointSpecs = [];

    // Radial waypoints around the midpoint between start and end
    const midLng = (start.lng + end.lng) / 2;
    const midLat = (start.lat + end.lat) / 2;
    waypointSpecs.push(...generateRadialWaypoints(midLng, midLat, distances));

    // Radial waypoints around the densest tree segment
    const { midpoint } = findDensestSegment(treeIndex, coords);
    waypointSpecs.push(...generateRadialWaypoints(midpoint[0], midpoint[1], distances));

    // Deduplicate waypoints that are very close together
    const uniqueWaypoints = [];
    for (const wp of waypointSpecs) {
      const isDupe = uniqueWaypoints.some(
        (u) => Math.abs(u[0] - wp[0]) < 0.0002 && Math.abs(u[1] - wp[1]) < 0.0002
      );
      if (!isDupe) uniqueWaypoints.push(wp);
    }

    // Score waypoints by nearby tree density, prioritize tree-sparse areas
    const scored = uniqueWaypoints.map((wp) => ({
      wp,
      nearbyTrees: countTreesNearPoint(treeIndex, wp[0], wp[1], 50).length,
    }));
    scored.sort((a, b) => a.nearbyTrees - b.nearbyTrees);

    // Fetch routes via best waypoints in parallel
    const toTry = scored.slice(0, 12).map((s) => s.wp);
    const waypointRoutes = await Promise.all(
      toTry.map((wp) => getRouteViaWaypoint(start, wp, end, token).catch(() => null))
    );

    for (const wr of waypointRoutes) {
      if (!wr || wr.duration > maxDuration) continue;
      if (hasSignificantBacktracking(wr.geometry.coordinates)) continue;
      wr.treeCount = countTreesAlongRoute(treeIndex, wr.geometry.coordinates);
      candidates.push(wr);
    }
  }

  // Pick the route with the fewest trees; break ties by shorter duration
  const shortestTreeCount = countTreesAlongRoute(treeIndex, shortest.geometry.coordinates);

  candidates.sort((a, b) => a.treeCount - b.treeCount || a.duration - b.duration);

  const best = candidates[0];

  // Get the actual coordinates of trees along the best route for highlighting
  const highlightedTrees = findTreesAlongRoute(treeIndex, best.geometry.coordinates);

  return {
    geometry: best.geometry,
    duration: best.duration,
    distance: best.distance,
    treesOnRoute: best.treeCount,
    treesOnShortest: shortestTreeCount,
    shortestDuration: shortest.duration,
    shortestDistance: shortest.distance,
    highlightedTrees,
  };
}
