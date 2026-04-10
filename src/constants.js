export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiaXNhYmVscmluZ2luZzEiLCJhIjoiY21ua2plZGV1MHl2ZDJwcHJiZjhjeDE1cyJ9.rJmToTCcwDzf6wu-PERFgw';

export const INITIAL_VIEW_STATE = {
  longitude: -73.95,
  latitude: 40.72,
  zoom: 10.5,
  minZoom: 9.5,
};

export const HEALTH_COLORS = {
  Good: '#86efac',
  Fair: '#fde68a',
  Poor: '#fca5a5',
  default: '#d4d4d8',
};

export const TREE_TYPE_COLORS = {
  oak: '#3b82f6',      // Blue
  birch: '#facc15',    // Yellow
  maple: '#ff8800',    // Orange
  ash: '#86efac',      // Green
  mulberry: '#e879f9', // Pink
  walnut: '#a0522d',   // Brown
  willow: '#2dd4bf',   // Teal
  other: '#d4d4d8',    // Grey fallback
};

export const NYC_BBOX = [-74.257159, 40.496010, -73.699215, 40.915568];

export const routeOutlineLayer = {
  id: 'route-outline',
  type: 'line',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': '#491d76',
    'line-width': 8,
    'line-opacity': 0.3,
  },
};

export const routeLineLayer = {
  id: 'route-line',
  type: 'line',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': '#7c3aed',
    'line-width': 5,
    'line-opacity': 0.85,
  },
};

export const startEndLayer = {
  id: 'start-end-points',
  type: 'circle',
  paint: {
    'circle-radius': 8,
    'circle-color': '#7c3aed',
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
  },
};

export const highlightTreeLayer = {
  id: 'tree-highlight',
  type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 9.5, 3, 13, 6, 16, 9],
    'circle-color': 'transparent',
    'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 9.5, 1, 13, 2, 16, 3],
    'circle-stroke-color': '#ef4444',
  },
};

export const pointLayer = {
  id: 'tree-point',
  type: 'circle',
  paint: {
    'circle-color': [
      'match',
      ['get', 'tree_type'],
      'oak', '#3b82f6',
      'birch', '#facc15',
      'maple', '#ff8800',
      'ash', '#86efac',
      'mulberry', '#e879f9',
      'walnut', '#a0522d',
      'willow', '#2dd4bf',
      '#d4d4d8',
    ],
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 9.5, 1.5, 13, 4, 16, 7],
    'circle-opacity': 0.85,
    'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 9.5, 0, 13, 0.5, 16, 1],
    'circle-stroke-color': '#ffffff',
  },
};
