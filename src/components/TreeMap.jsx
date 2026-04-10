import { useState, useCallback, useRef, useEffect } from 'react';
import Map, { Source, Layer, Popup } from 'react-map-gl/mapbox';
import TreePopup from './TreePopup';
import {
  MAPBOX_TOKEN,
  INITIAL_VIEW_STATE,
  pointLayer,
  highlightTreeLayer,
  routeOutlineLayer,
  routeLineLayer,
  startEndLayer,
} from '../constants';

function getBounds(coords) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

export default function TreeMap({ treeGeoJson, routeGeoJson, highlightedTreesGeoJson, previewMarkersGeoJson, activeInput, onMapPin }) {
  const mapRef = useRef(null);
  const hoverDotRef = useRef(null);
  const [popupInfo, setPopupInfo] = useState(null);

  useEffect(() => {
    if (!routeGeoJson || !mapRef.current) return;
    try {
      const bounds = getBounds(routeGeoJson.geometry.coordinates);
      mapRef.current.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 360, right: 80 }, duration: 1000 });
    } catch (e) {
      console.warn('fitBounds failed:', e);
    }
  }, [routeGeoJson]);

  // Manage hover dot via native map events to avoid React re-render storms
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const dot = hoverDotRef.current;
    if (!dot) return;

    if (!activeInput) {
      dot.style.display = 'none';
      return;
    }

    const onMove = (e) => {
      const point = map.project(e.lngLat);
      dot.style.display = 'block';
      dot.style.transform = `translate(${point.x}px, ${point.y}px)`;
    };

    const onLeave = () => {
      dot.style.display = 'none';
    };

    map.on('mousemove', onMove);
    map.getCanvas().addEventListener('mouseleave', onLeave);

    return () => {
      map.off('mousemove', onMove);
      map.getCanvas().removeEventListener('mouseleave', onLeave);
      dot.style.display = 'none';
    };
  }, [activeInput]);

  const onClick = useCallback((event) => {
    if (activeInput && onMapPin) {
      onMapPin(event.lngLat.lng, event.lngLat.lat);
      return;
    }

    const feature = event.features?.[0];
    if (!feature) {
      setPopupInfo(null);
      return;
    }

    const [lng, lat] = feature.geometry.coordinates;
    setPopupInfo({
      longitude: lng,
      latitude: lat,
      ...feature.properties,
    });
  }, [activeInput, onMapPin]);

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={INITIAL_VIEW_STATE}
      style={{ width: '100%', height: '100%', cursor: activeInput ? 'crosshair' : '' }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      interactiveLayerIds={['tree-point']}
      onClick={onClick}
    >
      {treeGeoJson && (
        <Source id="trees" type="geojson" data={treeGeoJson}>
          <Layer {...pointLayer} />
        </Source>
      )}

      {routeGeoJson && (
        <Source id="route" type="geojson" data={routeGeoJson}>
          <Layer {...routeOutlineLayer} />
          <Layer {...routeLineLayer} />
        </Source>
      )}

      {highlightedTreesGeoJson && (
        <Source id="highlighted-trees" type="geojson" data={highlightedTreesGeoJson}>
          <Layer {...highlightTreeLayer} />
        </Source>
      )}

      {previewMarkersGeoJson && (
        <Source id="start-end" type="geojson" data={previewMarkersGeoJson}>
          <Layer {...startEndLayer} />
        </Source>
      )}

      {popupInfo && (
        <Popup
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          anchor="bottom"
          onClose={() => setPopupInfo(null)}
          closeOnClick={false}
        >
          <TreePopup tree={popupInfo} />
        </Popup>
      )}

      {/* Hover dot rendered via DOM manipulation, not React state */}
      <div
        ref={hoverDotRef}
        style={{
          display: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          width: 16,
          height: 16,
          marginLeft: -15,
          marginTop: -15,
          borderRadius: '50%',
          background: '#7c3aed',
          border: '2px solid white',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          opacity: 0.7,
          pointerEvents: 'none',
          zIndex: 5,
        }}
      />
    </Map>
  );
}
