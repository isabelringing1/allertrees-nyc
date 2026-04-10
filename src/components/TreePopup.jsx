import { HEALTH_COLORS } from '../constants';

export default function TreePopup({ tree }) {
  const health = tree.health || 'Unknown';
  const color = HEALTH_COLORS[health] || HEALTH_COLORS.default;

  return (
    <div className="tree-popup">
      <h3>{tree.spc_common || 'Unknown Tree'}</h3>
      <div className="detail">
        <span className="label">Health</span>
        <span>
          <span className="health-dot" style={{ backgroundColor: color }} />
          {health}
        </span>
      </div>
      <div className="detail">
        <span className="label">Address</span>
        <span>{tree.address || '—'}</span>
      </div>
      <div className="detail">
        <span className="label">Neighborhood</span>
        <span>{tree.neighborhood || '—'}</span>
      </div>
      <div className="detail">
        <span className="label">Borough</span>
        <span>{tree.borough || '—'}</span>
      </div>
    </div>
  );
}
