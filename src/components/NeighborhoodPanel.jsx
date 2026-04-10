import { useState, useMemo } from 'react';
import './NeighborhoodPanel.css';

const TOP_N = 5;
const BOROUGH_ORDER = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];

export default function NeighborhoodPanel({ treeGeoJson, onNeighborhoodClick }) {
  const [expanded, setExpanded] = useState(false);

  const boroughData = useMemo(() => {
    if (!treeGeoJson?.features?.length) return null;

    // Count trees and accumulate coordinates per neighborhood+borough
    const stats = new Map();
    for (const f of treeGeoJson.features) {
      const { neighborhood, borough } = f.properties;
      if (!neighborhood || !borough) continue;
      const key = `${borough}|||${neighborhood}`;
      if (!stats.has(key)) stats.set(key, { count: 0, lngSum: 0, latSum: 0 });
      const s = stats.get(key);
      s.count++;
      const [lng, lat] = f.geometry.coordinates;
      s.lngSum += lng;
      s.latSum += lat;
    }

    // Group by borough
    const byBorough = new Map();
    for (const [key, { count, lngSum, latSum }] of stats) {
      const [borough, neighborhood] = key.split('|||');
      if (!byBorough.has(borough)) byBorough.set(borough, []);
      byBorough.get(borough).push({
        neighborhood,
        count,
        lng: lngSum / count,
        lat: latSum / count,
      });
    }

    // Order boroughs per spec, neighborhoods by count desc, take top N
    return BOROUGH_ORDER
      .filter((b) => byBorough.has(b))
      .map((borough) => ({
        borough,
        neighborhoods: byBorough.get(borough)
          .sort((a, b) => b.count - a.count)
          .slice(0, TOP_N),
      }));
  }, [treeGeoJson]);

  if (!boroughData) return null;

  return (
    <div className={`neighborhood-panel ${expanded ? '' : 'neighborhood-panel-collapsed'}`}>
      <div className="neighborhood-panel-header" onClick={() => setExpanded((v) => !v)}>
        So Where Can I NOT Hang Out?
        <span className="neighborhood-panel-chevron">{expanded ? '\u25B2' : '\u25BC'}</span>
      </div>
      {expanded && (
        <div className="neighborhood-panel-body">
          <div className="neighborhood-row ">These neighborhoods will probably make you sneeze:</div>
          {boroughData.map(({ borough, neighborhoods }) => (
            <div key={borough} className="neighborhood-borough-group">
              <div className="neighborhood-borough-name">{borough}</div>
              {neighborhoods.map(({ neighborhood, count, lng, lat }) => (
                <div
                  key={neighborhood}
                  className="neighborhood-row neighborhood-row-clickable"
                  onClick={() => onNeighborhoodClick?.({ lng, lat })}
                >
                  <span className="neighborhood-name">{neighborhood}</span>
                  <span className="neighborhood-count">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
