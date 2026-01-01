import React, { useState } from 'react';
import clsx from 'clsx';
import { User, ScrollText, ArrowRight } from 'lucide-react';

/**
 * Item Type Selector
 *
 * Presents a choice between creating a Lumia (character) or Loom (modifier) item.
 * Used as an intermediate step when adding new items to a pack.
 *
 * Props:
 * - packName: The target pack name (displayed in header)
 * - onSelectLumia: Callback when Lumia is selected
 * - onSelectLoom: Callback when Loom is selected
 * - onBack: Optional callback to go back
 */
function ItemTypeSelector({ packName, onSelectLumia, onSelectLoom, onBack }) {
    const [hoveredType, setHoveredType] = useState(null);

    return (
        <div className="lumiverse-type-selector">
            {/* Header */}
            <div className="lumiverse-type-selector-header">
                <h3 className="lumiverse-type-selector-title">Add to {packName}</h3>
                <p className="lumiverse-type-selector-subtitle">
                    Choose what you'd like to create
                </p>
            </div>

            {/* Option Cards */}
            <div className="lumiverse-type-selector-options">
                {/* Lumia Option */}
                <button
                    className={clsx(
                        'lumiverse-type-option',
                        'lumiverse-type-option--lumia',
                        hoveredType === 'lumia' && 'lumiverse-type-option--hovered'
                    )}
                    onClick={onSelectLumia}
                    onMouseEnter={() => setHoveredType('lumia')}
                    onMouseLeave={() => setHoveredType(null)}
                    type="button"
                >
                    <div className="lumiverse-type-option-icon">
                        <User size={28} strokeWidth={1.5} />
                    </div>
                    <div className="lumiverse-type-option-content">
                        <span className="lumiverse-type-option-label">Lumia</span>
                        <span className="lumiverse-type-option-desc">
                            Character definition with physicality, personality, and behavior
                        </span>
                    </div>
                    <div className="lumiverse-type-option-arrow">
                        <ArrowRight size={18} strokeWidth={2} />
                    </div>
                </button>

                {/* Loom Option */}
                <button
                    className={clsx(
                        'lumiverse-type-option',
                        'lumiverse-type-option--loom',
                        hoveredType === 'loom' && 'lumiverse-type-option--hovered'
                    )}
                    onClick={onSelectLoom}
                    onMouseEnter={() => setHoveredType('loom')}
                    onMouseLeave={() => setHoveredType(null)}
                    type="button"
                >
                    <div className="lumiverse-type-option-icon">
                        <ScrollText size={28} strokeWidth={1.5} />
                    </div>
                    <div className="lumiverse-type-option-content">
                        <span className="lumiverse-type-option-label">Loom</span>
                        <span className="lumiverse-type-option-desc">
                            Narrative style, utility, or retrofit modifier
                        </span>
                    </div>
                    <div className="lumiverse-type-option-arrow">
                        <ArrowRight size={18} strokeWidth={2} />
                    </div>
                </button>
            </div>

            {/* Footer */}
            {onBack && (
                <div className="lumiverse-type-selector-footer">
                    <button
                        className="lumiverse-btn lumiverse-btn--secondary"
                        onClick={onBack}
                        type="button"
                    >
                        Back
                    </button>
                </div>
            )}
        </div>
    );
}

export default ItemTypeSelector;
