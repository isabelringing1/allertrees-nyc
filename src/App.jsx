import { useMemo, useState, useCallback, useRef } from 'react';
import TreeMap from './components/TreeMap';
import RoutePanel from './components/RoutePanel';
import AllergenPicker from './components/AllergenPicker';
import NeighborhoodPanel from './components/NeighborhoodPanel';
import useTreeIndex from './hooks/useTreeIndex';
import useRoute from './hooks/useRoute';
import { reverseGeocode } from './lib/search';
import { MAPBOX_TOKEN } from './constants';
import flower from '/flower.png';
import isabisabel from '/isabisabel.png';

export default function App() {
  const { index, loading: treeIndexLoading, geojson: treeGeoJson, loadAllergen } = useTreeIndex();
  const route = useRoute(index);
  const [selectedAllergens, setSelectedAllergens] = useState(null);
  const [activeInput, setActiveInput] = useState(null);
  const [mapPin, setMapPin] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);

  var isMobile = window.innerWidth < 600;

  const handleAllergenSelect = useCallback((allergenKeys) => {
    setSelectedAllergens(allergenKeys);
    route.reset();
    loadAllergen(allergenKeys);
  }, [loadAllergen, route.reset]);

  const onMapPin = useCallback(async (lng, lat) => {
    const result = await reverseGeocode(lng, lat, MAPBOX_TOKEN);
    const pin = result || { lng, lat, formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    setMapPin({ field: activeInput, ...pin });

    if (activeInput === 'start') setStartCoords([pin.lng, pin.lat]);
    else if (activeInput === 'end') setEndCoords([pin.lng, pin.lat]);

    setActiveInput(null);
  }, [activeInput]);

  const handleCoordsChange = useCallback((field, coords) => {
    if (field === 'start') setStartCoords(coords);
    else if (field === 'end') setEndCoords(coords);

    route.reset();
  }, [route.reset]);

  const routeGeoJson = useMemo(() => {
    if (!route.result) return null;
    return { type: 'Feature', geometry: route.result.geometry };
  }, [route.result]);

  const highlightedTreesGeoJson = useMemo(() => {
    if (!route.result?.highlightedTrees?.length) return null;
    return {
      type: 'FeatureCollection',
      features: route.result.highlightedTrees.map(([lng, lat]) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
      })),
    };
  }, [route.result]);

  const previewMarkersGeoJson = useMemo(() => {
    const features = [];
    if (startCoords) {
      features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: startCoords } });
    }
    if (endCoords) {
      features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: endCoords } });
    }
    return features.length > 0 ? { type: 'FeatureCollection', features } : null;
  }, [startCoords, endCoords]);

  const mapRef = useRef(null);

  const handleNeighborhoodClick = useCallback(({ lng, lat }) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 1200 });
  }, []);

  const [showAbout, setShowAbout] = useState(false);

  return (
    <div className="app">
      <div className="header">
        <span className="header-title">
          {!isMobile && <img src={flower} className="header-flower" />}
          I Love Spring But It Makes Me Want To Die
          <img src={flower} className="header-flower" />
          </span>
        <button className="info-btn" onClick={() => setShowAbout(true)}>i</button>
      </div>
      {showAbout && (
        <div className="about-overlay" onClick={() => setShowAbout(false)}>
          <div className="about-modal" onClick={(e) => e.stopPropagation()}>
            <div className="about-header">About</div>
            <div className="about-body">
              <p>Do you love when the weather warms up, but dread the subsequent pollen explosion? This map shows you the top allergy hotspots, and how to best plan your outings to avoid them. </p>
              <p>Data is from the <a href="https://data.cityofnewyork.us/Environment/2015-Street-Tree-Census-Tree-Data/uvpi-gqnh/about_data" target='_blank'>2015 Street Tree Census</a> (last updated in 2024), courtesy of <a href="https://opendata.cityofnewyork.us/" target='_blank'>NYC OpenData</a>. Explore the entire <a href="https://tree-map.nycgovparks.org/tree-map" target='_blank'>NYC Tree Map</a>!</p>
              <p>Made by <a href="https://isabisabel.com" target='_blank'>Isabel</a> <img src={isabisabel} className="isabisabel" onClick={() => window.open('https://isabisabel.com', '_blank')} /></p>
            </div>
          </div>
        </div>
      )}
      {treeIndexLoading && (
        <div className="loading-overlay">
          <div className="loading-modal">Loading...</div>
        </div>
      )}
      <div className="map-container">
        <TreeMap
          ref={mapRef}
          treeGeoJson={treeGeoJson}
          routeGeoJson={routeGeoJson}
          highlightedTreesGeoJson={highlightedTreesGeoJson}
          previewMarkersGeoJson={previewMarkersGeoJson}
          activeInput={activeInput}
          onMapPin={onMapPin}
        />
        <div className="sidebar">
          <AllergenPicker
            onSelect={handleAllergenSelect}
            loading={treeIndexLoading}
            selectedAllergens={selectedAllergens}
            treeCount={treeGeoJson?.features?.length ?? 0}
          />
          {!!index && (
            <RoutePanel
              route={route}
              treeIndexLoading={treeIndexLoading}
              treesReady={!!index}
              selectedAllergen={selectedAllergens}
              onCalculate={route.calculateRoute}
              activeInput={activeInput}
              setActiveInput={setActiveInput}
              mapPin={mapPin}
              onCoordsChange={handleCoordsChange}
            />
          )}
          <NeighborhoodPanel treeGeoJson={treeGeoJson} onNeighborhoodClick={handleNeighborhoodClick} />
        </div>
      </div>
    </div>
  );
}
