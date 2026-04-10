import { useState, useEffect, useRef, useCallback } from 'react';
import { suggestAddresses, retrieveAddress, generateSessionToken } from '../lib/search';
import { MAPBOX_TOKEN } from '../constants';
import './RoutePanel.css';

const STATUS_TEXT = {
  geocoding: 'Geocoding addresses...',
  routing: 'Calculating routes...',
  scoring: 'Scoring tree exposure...',
  done: 'Done!',
};

function AddressInput({ label, placeholder, value, coords, onChange, onCoordsChange, onFocus, onBlur, isFocused, disabled, onComplete, inputRef }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const sessionRef = useRef(generateSessionToken());
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    onCoordsChange(null); // Clear resolved coords when typing

    clearTimeout(debounceRef.current);
    if (val.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await suggestAddresses(val, MAPBOX_TOKEN, sessionRef.current);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
    }, 300);
  };

  const handleSelect = async (suggestion) => {
    setShowDropdown(false);
    onChange(suggestion.fullAddress);
    try {
      const result = await retrieveAddress(suggestion.mapboxId, MAPBOX_TOKEN, sessionRef.current);
      onCoordsChange([result.lng, result.lat]);
      onChange(result.formattedAddress);
      sessionRef.current = generateSessionToken();
      onComplete?.();
    } catch {
      onCoordsChange(null);
    }
  };

  const handleFocus = () => {
    onFocus();
    if (suggestions.length > 0) setShowDropdown(true);
  };

  const handleBlur = (e) => {
    // Delay to allow click on dropdown
    setTimeout(() => {
      if (!wrapperRef.current?.contains(document.activeElement)) {
        setShowDropdown(false);
        onBlur();
      }
    }, 200);
  };

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <div className="route-panel-field" ref={wrapperRef}>
      <label>{label}</label>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        className={coords ? 'has-coords' : ''}
      />
      {isFocused && !disabled && (
        <div className="route-panel-map-hint">or click the map to drop a pin</div>
      )}
      {showDropdown && (
        <ul className="route-panel-dropdown">
          {suggestions.map((s) => (
            <li key={s.mapboxId} onMouseDown={() => handleSelect(s)}>
              {s.fullAddress}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RoutePanel({ route, treeIndexLoading, treesReady, selectedAllergen, onCalculate, activeInput, setActiveInput, mapPin, onCoordsChange }) {
  const [startAddr, setStartAddr] = useState('');
  const [endAddr, setEndAddr] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [detour, setDetour] = useState(5);
  const [expanded, setExpanded] = useState(false);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  // Handle map pin drops
  useEffect(() => {
    if (!mapPin) return;
    if (mapPin.field === 'start') {
      setStartAddr(mapPin.formattedAddress);
      setStartCoords([mapPin.lng, mapPin.lat]);
      // Focus end input if empty
      if (!endAddr.trim()) {
        setTimeout(() => { endInputRef.current?.focus(); }, 50);
      }
    } else if (mapPin.field === 'end') {
      setEndAddr(mapPin.formattedAddress);
      setEndCoords([mapPin.lng, mapPin.lat]);
      // Focus start input if empty
      if (!startAddr.trim()) {
        setTimeout(() => { startInputRef.current?.focus(); }, 50);
      }
    }
  }, [mapPin]);

  // Sync coords up to App for preview markers
  const handleStartCoordsChange = useCallback((coords) => {
    setStartCoords(coords);
    onCoordsChange('start', coords);
  }, [onCoordsChange]);

  const handleEndCoordsChange = useCallback((coords) => {
    setEndCoords(coords);
    onCoordsChange('end', coords);
  }, [onCoordsChange]);

  // Also sync map pin coords up
  useEffect(() => {
    if (!mapPin) return;
    if (mapPin.field === 'start') onCoordsChange('start', [mapPin.lng, mapPin.lat]);
    else if (mapPin.field === 'end') onCoordsChange('end', [mapPin.lng, mapPin.lat]);
  }, [mapPin, onCoordsChange]);

  const isLoading = route.status === 'geocoding' || route.status === 'routing' || route.status === 'scoring';
  const panelDisabled = !treesReady || treeIndexLoading;
  const canSubmit = !panelDisabled && !isLoading && startAddr.trim() && endAddr.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onCalculate(startAddr.trim(), endAddr.trim(), detour, startCoords, endCoords);
  };

  return (
    <div className={`route-panel ${expanded ? '' : 'route-panel-collapsed'}`}>
      <div className="route-panel-header" onClick={() => setExpanded((v) => !v)}>
        Plan A Route
        <span className="route-panel-chevron">{expanded ? '\u25B2' : '\u25BC'}</span>
      </div>
      {expanded && <form className="route-panel-body" onSubmit={handleSubmit}>
        <AddressInput
          label="Start Location"
          placeholder="e.g. 350 5th Ave, Manhattan"
          value={startAddr}
          coords={startCoords}
          onChange={setStartAddr}
          onCoordsChange={handleStartCoordsChange}
          onFocus={() => setActiveInput('start')}
          onBlur={() => { if (activeInput === 'start') setActiveInput(null); }}
          isFocused={activeInput === 'start'}
          disabled={isLoading}
          inputRef={startInputRef}
          onComplete={() => { if (!endAddr.trim()) setTimeout(() => endInputRef.current?.focus(), 50); }}
        />

        <AddressInput
          label="End Location"
          placeholder="e.g. 200 Central Park West"
          value={endAddr}
          coords={endCoords}
          onChange={setEndAddr}
          onCoordsChange={handleEndCoordsChange}
          onFocus={() => setActiveInput('end')}
          onBlur={() => { if (activeInput === 'end') setActiveInput(null); }}
          isFocused={activeInput === 'end'}
          disabled={isLoading}
          inputRef={endInputRef}
          onComplete={() => { if (!startAddr.trim()) setTimeout(() => startInputRef.current?.focus(), 50); }}
        />

        <div className="route-panel-slider">
          <label>
            Max Detour You're Willing to Take
            <span>{detour} min</span>
          </label>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={detour}
            onChange={(e) => setDetour(Number(e.target.value))}
            disabled={isLoading}
          />
        </div>

        <button type="submit" className="route-panel-btn" disabled={!canSubmit}>
          {!selectedAllergen ? 'Select an allergen first' : treeIndexLoading ? 'Loading tree data...' : isLoading ? 'Calculating...' : 'Find Route'}
        </button>

        {isLoading && (
          <div className="route-panel-status">
            <div className="route-panel-dot" />
            {STATUS_TEXT[route.status] || 'Working...'}
          </div>
        )}

        {route.error && (
          <div className="route-panel-error">{route.error}</div>
        )}

        {route.status === 'done' && route.result && (() => {
          const r = route.result;
          const dist = (r.distance / 1609.34).toFixed(1);
          const shortDist = (r.shortestDistance / 1609.34).toFixed(1);
          const time = Math.round(r.duration / 60);
          const shortTime = Math.round(r.shortestDuration / 60);
          const distChanged = dist !== shortDist;
          const timeChanged = time !== shortTime;
          return (
            <div className="route-panel-result">
              <div className="route-panel-result-row">
                <span>Distance</span>
                <span className="value">
                  {distChanged && <span className="struck">{shortDist}</span>}
                  {dist} mi
                </span>
              </div>
              <div className="route-panel-result-row">
                <span>Walk time</span>
                <span className="value">
                  {timeChanged && <span className="struck">{shortTime}</span>}
                  {time} min
                </span>
              </div>
              <div className="route-panel-result-row">
                <span>Trees on route</span>
                <span className="value">
                  {r.treesOnShortest !== r.treesOnRoute && (
                    <span className="struck">{r.treesOnShortest}</span>
                  )}
                  {r.treesOnRoute}
                </span>
              </div>
              <div className="route-panel-trees">
                <div className="trees-label-top">You will see</div>
                <div className="trees-number">{r.treesOnRoute}</div>
                <div className="trees-label-bottom">allergenic {r.treesOnRoute === 1 ? 'tree' : 'trees'} on this route</div>
              </div>
            </div>
          );
        })()}
      </form>}
    </div>
  );
}
