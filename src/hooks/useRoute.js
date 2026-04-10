import { useState, useCallback } from 'react';
import { geocodeAddress, findBestRoute } from '../lib/routing';
import { MAPBOX_TOKEN } from '../constants';

export default function useRoute(treeIndex) {
  const [state, setState] = useState({
    status: 'idle',
    result: null,
    error: null,
  });

  const calculateRoute = useCallback(
    async (startAddr, endAddr, detourMinutes, startCoords, endCoords) => {
      if (!treeIndex) {
        setState({ status: 'error', result: null, error: 'Tree index still loading' });
        return;
      }

      try {
        let startGeo, endGeo;

        if (startCoords && endCoords) {
          // Pre-resolved coords from autocomplete or map pin
          setState({ status: 'routing', result: null, error: null });
          startGeo = { lng: startCoords[0], lat: startCoords[1], formattedAddress: startAddr };
          endGeo = { lng: endCoords[0], lat: endCoords[1], formattedAddress: endAddr };
        } else {
          // Need to geocode
          setState({ status: 'geocoding', result: null, error: null });
          [startGeo, endGeo] = await Promise.all([
            startCoords
              ? { lng: startCoords[0], lat: startCoords[1], formattedAddress: startAddr }
              : geocodeAddress(startAddr, MAPBOX_TOKEN),
            endCoords
              ? { lng: endCoords[0], lat: endCoords[1], formattedAddress: endAddr }
              : geocodeAddress(endAddr, MAPBOX_TOKEN),
          ]);
        }

        setState((s) => ({ ...s, status: 'routing' }));
        const result = await findBestRoute(
          startGeo,
          endGeo,
          MAPBOX_TOKEN,
          treeIndex,
          detourMinutes * 60
        );

        setState({
          status: 'done',
          result: {
            ...result,
            startCoords: [startGeo.lng, startGeo.lat],
            endCoords: [endGeo.lng, endGeo.lat],
            startAddress: startGeo.formattedAddress,
            endAddress: endGeo.formattedAddress,
          },
          error: null,
        });
      } catch (err) {
        setState({ status: 'error', result: null, error: err.message });
      }
    },
    [treeIndex]
  );

  const reset = useCallback(() => {
    setState({ status: 'idle', result: null, error: null });
  }, []);

  return { ...state, calculateRoute, reset };
}
