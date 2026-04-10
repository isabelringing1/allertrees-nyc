import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data');
const OUTPUT_FILE = join(OUTPUT_DIR, 'callery-pears.geojson');

const BASE_URL = 'https://data.cityofnewyork.us/resource/uvpi-gqnh.json';
const LIMIT = 50000;

async function fetchPage(offset) {
  const params = new URLSearchParams({
    '$where': "spc_common='Callery pear'",
    '$select': 'tree_id,latitude,longitude,health,address,boroname,tree_dbh,status',
    '$limit': LIMIT.toString(),
    '$offset': offset.toString(),
    '$order': 'tree_id',
  });

  const url = `${BASE_URL}?${params}`;
  console.log(`Fetching offset ${offset}...`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

function toFeature(row) {
  const lng = parseFloat(row.longitude);
  const lat = parseFloat(row.latitude);

  if (!lng || !lat || lng === 0 || lat === 0) return null;

  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {
      id: row.tree_id,
      health: row.health || null,
      address: row.address || '',
      borough: row.boroname || '',
      dbh: row.tree_dbh ? parseInt(row.tree_dbh, 10) : 0,
      status: row.status || '',
    },
  };
}

async function main() {
  const features = [];
  let offset = 0;

  while (true) {
    const rows = await fetchPage(offset);
    if (rows.length === 0) break;

    for (const row of rows) {
      const feature = toFeature(row);
      if (feature) features.push(feature);
    }

    console.log(`  Got ${rows.length} rows, ${features.length} valid features so far`);
    offset += LIMIT;

    // Small delay to be nice to the API
    if (rows.length === LIMIT) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const geojson = { type: 'FeatureCollection', features };
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(geojson));

  const sizeMB = (Buffer.byteLength(JSON.stringify(geojson)) / 1024 / 1024).toFixed(1);
  console.log(`\nDone! ${features.length} Callery Pear trees written to ${OUTPUT_FILE} (${sizeMB} MB)`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
