import { useState, useCallback } from 'react';
import { buildSpatialIndex } from '../lib/spatialIndex';
import { fetchTreesByAllergen } from '../lib/treeApi';

export default function useTreeIndex() {
  const [index, setIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geojson, setGeojson] = useState(null);

  const loadAllergen = useCallback(async (allergenKey) => {
    if (!allergenKey) {
      setIndex(null);
      setGeojson(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setIndex(null);
    setGeojson(null);

    try {
      const data = await fetchTreesByAllergen(allergenKey);
      const idx = buildSpatialIndex(data.features);
      setIndex(idx);
      setGeojson(data);
    } catch (err) {
      console.error('Failed to load tree data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { index, loading, geojson, loadAllergen };
}
