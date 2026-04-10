const MIN_LNG = -74.257159;
const MIN_LAT = 40.496010;
const CELL_LNG = 0.0024; // ~203m at NYC latitude
const CELL_LAT = 0.002;  // ~222m
const COS_LAT = 0.7585;  // cos(40.7°) precomputed
const DEG_TO_M = 111320;

function cellKey(col, row) {
  return col * 10000 + row;
}

export function buildSpatialIndex(features) {
  const grid = new Map();
  const coords = new Float64Array(features.length * 2);

  for (let i = 0; i < features.length; i++) {
    const [lng, lat] = features[i].geometry.coordinates;
    coords[i * 2] = lng;
    coords[i * 2 + 1] = lat;

    const col = Math.floor((lng - MIN_LNG) / CELL_LNG);
    const row = Math.floor((lat - MIN_LAT) / CELL_LAT);
    const key = cellKey(col, row);

    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(i);
  }

  return { grid, coords, count: features.length };
}

function distanceMeters(lng1, lat1, lng2, lat2) {
  const dx = (lng2 - lng1) * COS_LAT * DEG_TO_M;
  const dy = (lat2 - lat1) * DEG_TO_M;
  return Math.sqrt(dx * dx + dy * dy);
}

function countTreesNearPoint(index, lng, lat, radius) {
  const col = Math.floor((lng - MIN_LNG) / CELL_LNG);
  const row = Math.floor((lat - MIN_LAT) / CELL_LAT);
  const found = [];

  for (let dc = -1; dc <= 1; dc++) {
    for (let dr = -1; dr <= 1; dr++) {
      const bucket = index.grid.get(cellKey(col + dc, row + dr));
      if (!bucket) continue;
      for (const idx of bucket) {
        const tlng = index.coords[idx * 2];
        const tlat = index.coords[idx * 2 + 1];
        if (distanceMeters(lng, lat, tlng, tlat) <= radius) {
          found.push(idx);
        }
      }
    }
  }

  return found;
}

function interpolate(lng1, lat1, lng2, lat2, fraction) {
  return [
    lng1 + (lng2 - lng1) * fraction,
    lat1 + (lat2 - lat1) * fraction,
  ];
}

export function countTreesAlongRoute(index, routeCoords, sampleInterval = 20, radius = 20) {
  const seen = new Set();
  let accumulated = 0;

  // Sample the first point
  const trees0 = countTreesNearPoint(index, routeCoords[0][0], routeCoords[0][1], radius);
  for (const t of trees0) seen.add(t);

  for (let i = 1; i < routeCoords.length; i++) {
    const [lng1, lat1] = routeCoords[i - 1];
    const [lng2, lat2] = routeCoords[i];
    const segLen = distanceMeters(lng1, lat1, lng2, lat2);

    if (segLen === 0) continue;

    accumulated += segLen;

    while (accumulated >= sampleInterval) {
      const overshoot = accumulated - sampleInterval;
      const fraction = 1 - overshoot / segLen;
      const [sLng, sLat] = interpolate(lng1, lat1, lng2, lat2, fraction);
      const trees = countTreesNearPoint(index, sLng, sLat, radius);
      for (const t of trees) seen.add(t);
      accumulated -= sampleInterval;
    }
  }

  // Sample the last point
  const last = routeCoords[routeCoords.length - 1];
  const treesLast = countTreesNearPoint(index, last[0], last[1], radius);
  for (const t of treesLast) seen.add(t);

  return seen.size;
}

export function findTreesAlongRoute(index, routeCoords, sampleInterval = 20, radius = 20) {
  const seen = new Set();
  let accumulated = 0;

  const trees0 = countTreesNearPoint(index, routeCoords[0][0], routeCoords[0][1], radius);
  for (const t of trees0) seen.add(t);

  for (let i = 1; i < routeCoords.length; i++) {
    const [lng1, lat1] = routeCoords[i - 1];
    const [lng2, lat2] = routeCoords[i];
    const segLen = distanceMeters(lng1, lat1, lng2, lat2);
    if (segLen === 0) continue;
    accumulated += segLen;
    while (accumulated >= sampleInterval) {
      const overshoot = accumulated - sampleInterval;
      const fraction = 1 - overshoot / segLen;
      const [sLng, sLat] = interpolate(lng1, lat1, lng2, lat2, fraction);
      const trees = countTreesNearPoint(index, sLng, sLat, radius);
      for (const t of trees) seen.add(t);
      accumulated -= sampleInterval;
    }
  }

  const last = routeCoords[routeCoords.length - 1];
  const treesLast = countTreesNearPoint(index, last[0], last[1], radius);
  for (const t of treesLast) seen.add(t);

  // Return [lng, lat] pairs for each tree found
  return Array.from(seen).map((idx) => [index.coords[idx * 2], index.coords[idx * 2 + 1]]);
}

export function findDensestSegment(index, routeCoords, numSegments = 5) {
  const totalPoints = routeCoords.length;
  const segSize = Math.floor(totalPoints / numSegments);
  let worstScore = -1;
  let worstIdx = 0;

  for (let s = 0; s < numSegments; s++) {
    const start = s * segSize;
    const end = s === numSegments - 1 ? totalPoints : (s + 1) * segSize;
    const segCoords = routeCoords.slice(start, end);
    if (segCoords.length < 2) continue;
    const count = countTreesAlongRoute(index, segCoords, 20, 20);
    if (count > worstScore) {
      worstScore = count;
      worstIdx = s;
    }
  }

  const midStart = worstIdx * segSize;
  const midEnd = worstIdx === numSegments - 1 ? totalPoints - 1 : (worstIdx + 1) * segSize;
  const midIdx = Math.floor((midStart + midEnd) / 2);

  return {
    midpoint: routeCoords[midIdx],
    segmentIndex: worstIdx,
    treeCount: worstScore,
  };
}

export function computeBearing(coord1, coord2) {
  const dLng = (coord2[0] - coord1[0]) * COS_LAT;
  const dLat = coord2[1] - coord1[1];
  return Math.atan2(dLng, dLat);
}

export function offsetPoint(lng, lat, bearing, distMeters) {
  const perpendicular = bearing + Math.PI / 2;
  const dLat = (distMeters * Math.cos(perpendicular)) / DEG_TO_M;
  const dLng = (distMeters * Math.sin(perpendicular)) / (COS_LAT * DEG_TO_M);
  return [lng + dLng, lat + dLat];
}
