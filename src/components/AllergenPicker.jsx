import { useState } from 'react';
import { ALLERGEN_OPTIONS } from '../lib/treeApi';
import { TREE_TYPE_COLORS } from '../constants';
import './AllergenPicker.css';

const SPECIFIC_KEYS = ALLERGEN_OPTIONS.filter((o) => o.key !== 'all');

function getAllergenKeys(keys) {
  if (keys.includes('all')) return SPECIFIC_KEYS.map((o) => o.key);
  return keys;
}

export default function AllergenPicker({ onSelect, loading, selectedAllergens, treeCount }) {
  const [choices, setChoices] = useState([]);

  // Collapsed state after selection
  if (selectedAllergens && selectedAllergens.length > 0 && !loading) {
    const displayKeys = getAllergenKeys(selectedAllergens);

    return (
      <div className="allergen-picker collapsed">
        <div className="allergen-collapsed-header">
          <span className="allergen-summary">Avoiding:</span>
          <button
            className="allergen-change-btn"
            onClick={() => onSelect(null)}
          >
            Change
          </button>
        </div>
        <div className="allergen-collapsed-body">
          <div className="allergen-tag-list">
            {displayKeys.map((key) => {
              const opt = ALLERGEN_OPTIONS.find((o) => o.key === key);
              return (
                <span key={key} className="allergen-tag">
                  {opt?.label}
                  <span className="allergen-color-dot" style={{ backgroundColor: TREE_TYPE_COLORS[key] || TREE_TYPE_COLORS.other }} />
                </span>
              );
            })}
          </div>
          <div className="allergen-tree-count">
            {treeCount.toLocaleString()} trees found
          </div>
        </div>
      </div>
    );
  }

  const handleToggle = (key) => {
    setChoices((prev) => {
      if (key === 'all') {
        return prev.includes('all') ? [] : ['all'];
      }
      const without = prev.filter((k) => k !== 'all');
      if (without.includes(key)) {
        return without.filter((k) => k !== key);
      }
      return [...without, key];
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (choices.length > 0) onSelect(choices);
  };

  return (
    <div className="allergen-picker">
      <div className="allergen-header">I'm Allergic To:</div>
      <form className="allergen-body" onSubmit={handleSubmit}>
        {ALLERGEN_OPTIONS.map((opt) => (
          <label key={opt.key} className="allergen-option">
            <input
              type="checkbox"
              name="allergen"
              value={opt.key}
              checked={choices.includes(opt.key)}
              onChange={() => handleToggle(opt.key)}
              disabled={loading}
            />
            <span>{opt.label}</span>
            {opt.key !== 'all' && (
              <span className="allergen-color-dot" style={{ backgroundColor: TREE_TYPE_COLORS[opt.key] }} />
            )}
          </label>
        ))}
        <button
          type="submit"
          className="allergen-submit-btn"
          disabled={choices.length === 0 || loading}
        >
          {loading ? 'Loading trees...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
