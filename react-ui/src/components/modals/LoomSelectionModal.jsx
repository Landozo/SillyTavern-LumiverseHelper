import React, { useState, useMemo, useCallback } from 'react';
import { usePacks, useLumiverseActions, useLoomSelections, saveToExtension } from '../../store/LumiverseContext';
import clsx from 'clsx';

// SVG icons for controls
const SVG_ICONS = {
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
    chevronUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`,
};

function Icon({ name, className }) {
    const svg = SVG_ICONS[name];
    if (!svg) return null;
    return (
        <span
            className={className}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

/**
 * Category mapping for Loom types
 * Maps modal type to the pack field name and store action
 *
 * OLD CODE: Selections are stored at root level, NOT nested under settings.loom
 * - selectedLoomStyle: [] (not settings.loom.selectedStyle)
 * - selectedLoomUtils: [] (not settings.loom.selectedUtility)
 * - selectedLoomRetrofits: []
 */
const LOOM_CATEGORIES = {
    loomStyles: {
        category: 'Narrative Style',
        packField: 'loomStyles',           // Field in pack structure (legacy)
        storeField: 'styles',              // Field name in useLoomSelections() return value
        toggleAction: 'toggleLoomStyle',   // Action name in store
        isMulti: true,
    },
    loomUtilities: {
        category: 'Loom Utilities',
        packField: 'loomUtils',
        storeField: 'utilities',
        toggleAction: 'toggleLoomUtility',
        isMulti: true,
    },
    loomRetrofits: {
        category: 'Retrofits',
        packField: 'loomRetrofits',
        storeField: 'retrofits',
        toggleAction: 'toggleLoomRetrofit',
        isMulti: true,
    },
};

/**
 * Search input component
 */
function SearchInput({ value, onChange, placeholder }) {
    return (
        <div className="lumiverse-search">
            <span className="lumiverse-search-icon">🔍</span>
            <input
                type="text"
                className="lumiverse-search-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
            {value && (
                <button
                    className="lumiverse-search-clear"
                    onClick={() => onChange('')}
                    type="button"
                    aria-label="Clear search"
                >
                    ✕
                </button>
            )}
        </div>
    );
}

/**
 * Individual Loom item row
 */
function LoomItem({ item, packName, isSelected, onToggle, isMulti }) {
    // Handle different field names for item name
    const itemName = item.loomName || item.itemName || item.name || 'Unknown';

    return (
        <div
            className={clsx(
                'lumiverse-loom-item',
                isSelected && 'lumiverse-loom-item--selected'
            )}
            onClick={() => onToggle(packName, itemName)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onToggle(packName, itemName)}
        >
            <div className="lumiverse-loom-item-content">
                <span className="lumiverse-loom-item-name">{itemName}</span>
            </div>
            <div className="lumiverse-loom-item-toggle">
                {isMulti ? (
                    <div className={clsx('lumiverse-toggle-switch', isSelected && 'checked')}>
                        <div className="lumiverse-toggle-track">
                            <div className="lumiverse-toggle-thumb" />
                        </div>
                    </div>
                ) : (
                    <span className={clsx('lumiverse-radio-dot', isSelected && 'checked')} />
                )}
            </div>
        </div>
    );
}

/**
 * Collapsible pack section for Loom items
 * Can be controlled (via isCollapsed + onToggleCollapse props) or uncontrolled
 */
function PackSection({
    pack,
    children,
    defaultOpen = true,
    isEditable,
    onRemovePack,
    // Optional controlled mode props
    isCollapsed: controlledCollapsed,
    onToggleCollapse,
}) {
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const itemCount = React.Children.count(children);
    const packName = pack.name || pack.packName || 'Unknown Pack';

    // Use controlled or uncontrolled state
    const isControlled = controlledCollapsed !== undefined;
    const isOpen = isControlled ? !controlledCollapsed : internalOpen;

    if (itemCount === 0) return null;

    const handleHeaderClick = (e) => {
        // Don't collapse if clicking remove button
        if (e.target.closest('.lumiverse-remove-pack-btn')) return;

        if (isControlled && onToggleCollapse) {
            onToggleCollapse(packName);
        } else {
            setInternalOpen(!internalOpen);
        }
    };

    return (
        <div className={clsx('lumiverse-pack-section', !isOpen && 'collapsed')}>
            <button
                className="lumiverse-pack-header"
                onClick={handleHeaderClick}
                type="button"
            >
                <span className={clsx('lumiverse-pack-chevron', isOpen && 'rotated')}>
                    ▼
                </span>
                <span className="lumiverse-pack-icon">📁</span>
                <span className="lumiverse-pack-name">{packName}</span>
                {isEditable && <span className="lumiverse-pack-badge-custom">Custom</span>}
                <span className="lumiverse-pack-count">{itemCount} items</span>
                <button
                    className="lumiverse-icon-btn-sm lumiverse-remove-pack-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemovePack(packName);
                    }}
                    title="Remove Pack"
                    type="button"
                >
                    <Icon name="trash" className="lumiverse-icon-sm" />
                </button>
            </button>
            {isOpen && <div className="lumiverse-pack-items">{children}</div>}
        </div>
    );
}

/**
 * Helper to get Loom items from a pack
 * Handles multiple possible pack structures:
 * - pack.loomStyles, pack.loomUtils, pack.loomRetrofits (legacy)
 * - pack.items with loomCategory field (new)
 */
function getLoomItemsFromPack(pack, config) {
    const items = [];
    const { category, packField } = config;

    // First, try the legacy structure (pack.loomStyles, pack.loomUtils, pack.loomRetrofits)
    if (pack[packField] && Array.isArray(pack[packField])) {
        pack[packField].forEach(item => {
            items.push({
                ...item,
                // Normalize the name field
                loomName: item.loomName || item.itemName || item.name,
            });
        });
    }

    // Then, try pack.items with loomCategory field
    if (pack.items && Array.isArray(pack.items)) {
        pack.items.forEach(item => {
            // Check multiple possible category field names
            const itemCategory = item.loomCategory || item.category || item.type;
            if (itemCategory === category || itemCategory === packField) {
                items.push({
                    ...item,
                    loomName: item.loomName || item.itemName || item.name,
                });
            }
        });
    }

    return items;
}

/**
 * Loom Selection Modal
 * Used for selecting Narrative Styles, Loom Utilities, and Retrofits
 *
 * OLD CODE: Selections stored at root level as arrays of { packName, itemName }
 */
function LoomSelectionModal({ type, onClose }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [collapsedPacks, setCollapsedPacks] = useState(new Set());
    const [sortBy, setSortBy] = useState('default'); // 'default', 'name', 'author'
    const { allPacks } = usePacks();
    const actions = useLumiverseActions();
    const loomSelections = useLoomSelections();  // { styles, utilities, retrofits }

    const config = LOOM_CATEGORIES[type];
    if (!config) {
        return <div className="lumiverse-error">Unknown Loom type: {type}</div>;
    }

    const { category, storeField, toggleAction, isMulti } = config;

    // Get current selections from the correct store field
    // useLoomSelections returns: { styles: [...], utilities: [...], retrofits: [...] }
    const currentSelections = useMemo(() => {
        const selection = loomSelections[storeField];
        if (!selection) return [];
        return Array.isArray(selection) ? selection : [selection];
    }, [loomSelections, storeField]);

    // Check if an item is selected
    const isSelected = useCallback((packName, itemName) => {
        return currentSelections.some(
            (s) => s.packName === packName && s.itemName === itemName
        );
    }, [currentSelections]);

    // Toggle selection using the store's toggle actions
    const handleToggle = useCallback((packName, itemName) => {
        const selection = { packName, itemName };
        // Use the appropriate toggle action from the store
        // toggleLoomStyle, toggleLoomUtility, or toggleLoomRetrofit
        if (actions[toggleAction]) {
            actions[toggleAction](selection);
            saveToExtension();
        } else {
            console.error(`[LoomSelectionModal] Unknown toggle action: ${toggleAction}`);
        }
    }, [actions, toggleAction]);

    // Clear all selections using the appropriate setter action
    const handleClear = useCallback(() => {
        // Map storeField to the setter action
        const setterMap = {
            styles: 'setSelectedLoomStyles',
            utilities: 'setSelectedLoomUtilities',
            retrofits: 'setSelectedLoomRetrofits',
        };
        const setterAction = setterMap[storeField];
        if (actions[setterAction]) {
            actions[setterAction]([]);
            saveToExtension();
        }
    }, [actions, storeField]);

    // Filter packs and get Loom items
    const filteredPacks = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        return allPacks
            .map((pack) => {
                // Get Loom items from pack
                const loomItems = getLoomItemsFromPack(pack, config);

                // Filter by search query
                const filteredItems = query
                    ? loomItems.filter(item => {
                        const name = (item.loomName || item.itemName || item.name || '').toLowerCase();
                        return name.includes(query);
                    })
                    : loomItems;

                return {
                    ...pack,
                    loomItems: filteredItems,
                    isEditable: pack.isCustom || pack.isEditable || false,
                };
            })
            .filter((pack) => pack.loomItems.length > 0);
    }, [allPacks, config, searchQuery]);

    // Sorted packs
    const sortedPacks = useMemo(() => {
        if (sortBy === 'default') return filteredPacks;

        return [...filteredPacks].sort((a, b) => {
            if (sortBy === 'name') {
                const nameA = (a.name || a.packName || '').toLowerCase();
                const nameB = (b.name || b.packName || '').toLowerCase();
                return nameA.localeCompare(nameB);
            }
            if (sortBy === 'author') {
                const authorA = (a.author || '').toLowerCase();
                const authorB = (b.author || '').toLowerCase();
                return authorA.localeCompare(authorB);
            }
            return 0;
        });
    }, [filteredPacks, sortBy]);

    // Collapse/Expand all functions
    const collapseAll = useCallback(() => {
        const allPackNames = filteredPacks.map(p => p.name || p.packName);
        setCollapsedPacks(new Set(allPackNames));
    }, [filteredPacks]);

    const expandAll = useCallback(() => {
        setCollapsedPacks(new Set());
    }, []);

    const togglePackCollapse = useCallback((packName) => {
        setCollapsedPacks(prev => {
            const next = new Set(prev);
            if (next.has(packName)) {
                next.delete(packName);
            } else {
                next.add(packName);
            }
            return next;
        });
    }, []);

    const isPackCollapsed = (packName) => collapsedPacks.has(packName);

    // Handle removing a pack
    const handleRemovePack = useCallback((packName) => {
        if (!window.confirm(`Delete pack "${packName}"? This action cannot be undone.`)) {
            return;
        }
        actions.removeCustomPack(packName);
        saveToExtension();
    }, [actions]);

    const totalItems = sortedPacks.reduce((sum, pack) => sum + pack.loomItems.length, 0);
    const selectedCount = currentSelections.length;

    // Get pack name helper
    const getPackName = (pack) => pack.name || pack.packName || 'Unknown Pack';

    return (
        <div className="lumiverse-loom-selection-modal">
            <div className="lumiverse-selection-toolbar">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={`Search ${category}...`}
                />
                <div className="lumiverse-selection-actions">
                    <span className="lumiverse-selection-count">
                        {selectedCount} selected
                    </span>
                    {selectedCount > 0 && (
                        <button
                            className="lumiverse-btn lumiverse-btn--text"
                            onClick={handleClear}
                            type="button"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Controls - Collapse/Expand and Sort */}
            {sortedPacks.length > 0 && (
                <div className="lumiverse-modal-controls">
                    {/* Collapse/Expand controls */}
                    <div className="lumiverse-modal-controls-group">
                        <button
                            className="lumiverse-modal-control-btn"
                            onClick={expandAll}
                            title="Expand all packs"
                            type="button"
                        >
                            <Icon name="chevronDown" className="lumiverse-control-icon" />
                            <span>Expand All</span>
                        </button>
                        <button
                            className="lumiverse-modal-control-btn"
                            onClick={collapseAll}
                            title="Collapse all packs"
                            type="button"
                        >
                            <Icon name="chevronUp" className="lumiverse-control-icon" />
                            <span>Collapse All</span>
                        </button>
                    </div>

                    {/* Sort dropdown */}
                    <div className="lumiverse-modal-sort">
                        <span className="lumiverse-modal-sort-label">Sort:</span>
                        <select
                            className="lumiverse-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="default">Default</option>
                            <option value="name">Pack Name</option>
                            <option value="author">Author</option>
                        </select>
                    </div>
                </div>
            )}

            <div className="lumiverse-selection-content">
                {totalItems === 0 ? (
                    <div className="lumiverse-empty-state">
                        <span className="lumiverse-empty-icon">📭</span>
                        <p>No "{category}" items found in loaded packs.</p>
                        {searchQuery && (
                            <button
                                className="lumiverse-btn lumiverse-btn--secondary"
                                onClick={() => setSearchQuery('')}
                                type="button"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    sortedPacks.map((pack) => {
                        const packName = getPackName(pack);
                        return (
                            <PackSection
                                key={pack.id || packName}
                                pack={pack}
                                isEditable={pack.isEditable}
                                onRemovePack={handleRemovePack}
                                isCollapsed={isPackCollapsed(packName)}
                                onToggleCollapse={togglePackCollapse}
                            >
                                {pack.loomItems.map((item) => {
                                    const itemName = item.loomName || item.itemName || item.name;
                                    return (
                                        <LoomItem
                                            key={`${packName}-${itemName}`}
                                            item={item}
                                            packName={packName}
                                            isSelected={isSelected(packName, itemName)}
                                            onToggle={handleToggle}
                                            isMulti={isMulti}
                                        />
                                    );
                                })}
                            </PackSection>
                        );
                    })
                )}
            </div>

            <div className="lumiverse-selection-footer">
                <button
                    className="lumiverse-btn lumiverse-btn--primary"
                    onClick={onClose}
                    type="button"
                >
                    Done
                </button>
            </div>
        </div>
    );
}

export default LoomSelectionModal;
