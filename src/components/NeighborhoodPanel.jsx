import { useState, useMemo } from 'react';
import './NeighborhoodPanel.css';

const TOP_N = 5;

export default function NeighborhoodPanel({ treeGeoJson }) {
  const [expanded, setExpanded] = useState(false);

  const boroughData = useMemo(() => {
    if (!treeGeoJson?.features?.length) return null;

    // Count trees per neighborhood+borough
    const counts = new Map();
    for (const f of treeGeoJson.features) {
      const { neighborhood, borough } = f.properties;
      if (!neighborhood || !borough) continue;
      const key = `${borough}|||${neighborhood}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    // Group by borough
    const byBorough = new Map();
    for (const [key, count] of counts) {
      const [borough, neighborhood] = key.split('|||');
      if (!byBorough.has(borough)) byBorough.set(borough, []);
      byBorough.get(borough).push({ neighborhood, count });
    }

    // Sort boroughs alphabetically, neighborhoods by count desc, take top N
    return Array.from(byBorough.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([borough, neighborhoods]) => ({
        borough,
        neighborhoods: neighborhoods
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
          {boroughData.map(({ borough, neighborhoods }) => (
            <div key={borough} className="neighborhood-borough-group">
              <div className="neighborhood-borough-name">{borough}</div>
              {neighborhoods.map(({ neighborhood, count }) => (
                <div key={neighborhood} className="neighborhood-row">
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
