import { TREE_TYPE_COLORS } from '../constants';

const items = [
  { label: 'Oak', color: TREE_TYPE_COLORS.oak },
  { label: 'Birch', color: TREE_TYPE_COLORS.birch },
  { label: 'Maple', color: TREE_TYPE_COLORS.maple },
  { label: 'Ash', color: TREE_TYPE_COLORS.ash },
  { label: 'Mulberry', color: TREE_TYPE_COLORS.mulberry },
  { label: 'Walnut', color: TREE_TYPE_COLORS.walnut },
  { label: 'Willow', color: TREE_TYPE_COLORS.willow },
];

export default function Legend() {
  return (
    <div className="legend">
      <h4>Tree Type</h4>
      {items.map((item) => (
        <div key={item.label} className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: item.color }} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
