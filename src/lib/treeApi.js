const API_BASE = 'https://data.cityofnewyork.us/resource/uvpi-gqnh.json';
const SELECT_FIELDS = 'tree_id,status,health,spc_common,address,boroname,nta_name,latitude,longitude';
const PAGE_SIZE = 50000;

const ALLERGEN_FILTERS = {
  oak: "spc_common like '%oak%'",
  birch: "spc_common like '%birch%'",
  maple: "spc_common like '%maple%'",
  ash: "spc_common like '%ash%'",
};

// Module-level cache: allergenKey -> GeoJSON FeatureCollection
const cache = new Map();

function buildWhereClause(allergenKeys) {
  const keys = Array.isArray(allergenKeys) ? allergenKeys : [allergenKeys];
  if (keys.includes('all')) {
    return Object.values(ALLERGEN_FILTERS).join(' OR ');
  }
  return keys.map((k) => ALLERGEN_FILTERS[k]).filter(Boolean).join(' OR ');
}

function classifyTreeType(spcCommon) {
  const name = (spcCommon || '').toLowerCase();
  if (name.includes('oak')) return 'oak';
  if (name.includes('birch')) return 'birch';
  if (name.includes('maple')) return 'maple';
  if (name.includes('ash')) return 'ash';
  return 'other';
}

function rowToFeature(row) {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)],
    },
    properties: {
      health: row.health || 'Unknown',
      spc_common: row.spc_common || '',
      tree_type: classifyTreeType(row.spc_common),
      address: row.address || '',
      borough: row.boroname || '',
      neighborhood: row.nta_name || '',
    },
  };
}

export async function fetchTreesByAllergen(allergenKeys) {
  const keys = Array.isArray(allergenKeys) ? allergenKeys : [allergenKeys];
  const cacheKey = keys.slice().sort().join(',');
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const where = buildWhereClause(keys);
  let allRows = [];
  let offset = 0;

  // Paginate until we get fewer rows than PAGE_SIZE
  while (true) {
    const url = new URL(API_BASE);
    url.searchParams.set('$select', SELECT_FIELDS);
    url.searchParams.set('$where', where);
    url.searchParams.set('$limit', String(PAGE_SIZE));
    url.searchParams.set('$offset', String(offset));

    const res = await fetch(url);
    if (!res.ok) throw new Error(`NYC OpenData API error: ${res.status}`);

    const rows = await res.json();
    // Filter out rows missing coordinates
    const valid = rows.filter((r) => r.latitude && r.longitude);
    allRows = allRows.concat(valid);

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const geojson = {
    type: 'FeatureCollection',
    features: allRows.map(rowToFeature),
  };

  cache.set(cacheKey, geojson);
  return geojson;
}

export const ALLERGEN_OPTIONS = [
  { key: 'oak', label: 'Oak' },
  { key: 'birch', label: 'Birch' },
  { key: 'maple', label: 'Maple' },
  { key: 'ash', label: 'Ash' },
  { key: 'all', label: "I don't know/The outdoors generally make me miserable" },
];
