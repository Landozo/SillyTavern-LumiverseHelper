import React, { useState, useMemo, useSyncExternalStore, useCallback } from 'react';
import clsx from 'clsx';
import { Users, Plus, Trash2, ChevronDown, ChevronUp, Edit2, X, Check, Zap, Heart, Star } from 'lucide-react';
import { useLumiverseStore, useLumiverseActions, usePacks, saveToExtension } from '../../store/LumiverseContext';

// Get store for direct state access
const store = useLumiverseStore;

// Stable fallback constants for useSyncExternalStore
const EMPTY_ARRAY = [];

// Stable selector functions
const selectCouncilMode = () => store.getState().councilMode || false;
const selectCouncilMembers = () => store.getState().councilMembers || EMPTY_ARRAY;

/**
 * Get display name for a Lumia item from pack data
 */
function getLumiaName(packs, packName, itemName) {
    const packsObj = Array.isArray(packs)
        ? packs.reduce((acc, p) => ({ ...acc, [p.name]: p }), {})
        : packs;
    const pack = packsObj[packName];
    if (!pack) return itemName;
    const item = pack.items?.find(i => i.lumiaDefName === itemName);
    return item?.lumiaDefName || itemName;
}

/**
 * Get Lumia image URL from pack data
 */
function getLumiaImage(packs, packName, itemName) {
    const packsObj = Array.isArray(packs)
        ? packs.reduce((acc, p) => ({ ...acc, [p.name]: p }), {})
        : packs;
    const pack = packsObj[packName];
    if (!pack) return null;
    const item = pack.items?.find(i => i.lumiaDefName === itemName);
    return item?.lumia_img || null;
}

/**
 * Collapsible member card
 */
function CouncilMemberCard({ member, packs, onUpdate, onRemove }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditingRole, setIsEditingRole] = useState(false);
    const [roleValue, setRoleValue] = useState(member.role || '');

    const memberName = getLumiaName(packs, member.packName, member.itemName);
    const memberImage = getLumiaImage(packs, member.packName, member.itemName);

    const handleRoleSave = () => {
        onUpdate(member.id, { role: roleValue });
        setIsEditingRole(false);
    };

    const handleRoleKeyDown = (e) => {
        if (e.key === 'Enter') handleRoleSave();
        if (e.key === 'Escape') {
            setRoleValue(member.role || '');
            setIsEditingRole(false);
        }
    };

    const behaviorsCount = member.behaviors?.length || 0;
    const personalitiesCount = member.personalities?.length || 0;

    return (
        <div className="lumiverse-council-member">
            <div className="lumiverse-council-member-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="lumiverse-council-member-avatar">
                    {memberImage ? (
                        <img src={memberImage} alt={memberName} />
                    ) : (
                        <Users size={20} strokeWidth={1.5} />
                    )}
                </div>
                <div className="lumiverse-council-member-info">
                    <span className="lumiverse-council-member-name">{memberName}</span>
                    {member.role && !isEditingRole && (
                        <span className="lumiverse-council-member-role">{member.role}</span>
                    )}
                    <div className="lumiverse-council-member-stats">
                        <span className="lumiverse-council-stat">
                            <Zap size={12} /> {behaviorsCount}
                        </span>
                        <span className="lumiverse-council-stat">
                            <Heart size={12} /> {personalitiesCount}
                        </span>
                    </div>
                </div>
                <div className="lumiverse-council-member-actions">
                    <button
                        className="lumiverse-council-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingRole(true);
                            setIsExpanded(true);
                        }}
                        title="Edit role"
                        type="button"
                    >
                        <Edit2 size={14} strokeWidth={1.5} />
                    </button>
                    <button
                        className="lumiverse-council-btn lumiverse-council-btn--danger"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(member.id);
                        }}
                        title="Remove from council"
                        type="button"
                    >
                        <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                    <span className={clsx('lumiverse-council-expand', isExpanded && 'lumiverse-council-expand--open')}>
                        <ChevronDown size={16} strokeWidth={2} />
                    </span>
                </div>
            </div>

            {isExpanded && (
                <div className="lumiverse-council-member-body">
                    {/* Role editor */}
                    {isEditingRole ? (
                        <div className="lumiverse-council-role-edit">
                            <label>Role/Title:</label>
                            <div className="lumiverse-council-role-input-row">
                                <input
                                    type="text"
                                    className="lumiverse-council-input"
                                    placeholder="e.g., Leader, Advisor, Wildcard..."
                                    value={roleValue}
                                    onChange={(e) => setRoleValue(e.target.value)}
                                    onKeyDown={handleRoleKeyDown}
                                    autoFocus
                                />
                                <button
                                    className="lumiverse-council-btn lumiverse-council-btn--primary"
                                    onClick={handleRoleSave}
                                    type="button"
                                >
                                    <Check size={14} strokeWidth={2} />
                                </button>
                                <button
                                    className="lumiverse-council-btn"
                                    onClick={() => {
                                        setRoleValue(member.role || '');
                                        setIsEditingRole(false);
                                    }}
                                    type="button"
                                >
                                    <X size={14} strokeWidth={2} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="lumiverse-council-role-display">
                            <span className="lumiverse-council-role-label">Role:</span>
                            <span className="lumiverse-council-role-value">
                                {member.role || <em>No role set</em>}
                            </span>
                        </div>
                    )}

                    {/* Traits summary */}
                    <div className="lumiverse-council-traits-section">
                        <div className="lumiverse-council-traits-group">
                            <span className="lumiverse-council-traits-label">
                                <Zap size={14} strokeWidth={1.5} /> Behaviors:
                            </span>
                            {behaviorsCount > 0 ? (
                                <span className="lumiverse-council-traits-list">
                                    {member.behaviors.map(b =>
                                        getLumiaName(packs, b.packName, b.itemName)
                                    ).join(', ')}
                                </span>
                            ) : (
                                <span className="lumiverse-council-traits-empty">None selected</span>
                            )}
                        </div>
                        <div className="lumiverse-council-traits-group">
                            <span className="lumiverse-council-traits-label">
                                <Heart size={14} strokeWidth={1.5} /> Personalities:
                            </span>
                            {personalitiesCount > 0 ? (
                                <span className="lumiverse-council-traits-list">
                                    {member.personalities.map(p =>
                                        getLumiaName(packs, p.packName, p.itemName)
                                    ).join(', ')}
                                </span>
                            ) : (
                                <span className="lumiverse-council-traits-empty">None selected</span>
                            )}
                        </div>
                    </div>

                    <p className="lumiverse-council-help-text">
                        Each member's inherent traits are auto-attached when added.
                        Additional trait configuration coming soon.
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * Add member dropdown/modal
 */
function AddMemberDropdown({ packs, existingMembers, onAdd, onClose }) {
    const [searchTerm, setSearchTerm] = useState('');

    // Get all Lumia items that aren't already council members
    const availableItems = useMemo(() => {
        const existing = new Set(existingMembers.map(m => `${m.packName}:${m.itemName}`));
        const items = [];

        const packsArray = Array.isArray(packs) ? packs : Object.values(packs || {});
        packsArray.forEach(pack => {
            const packName = pack.name || pack.packName;
            (pack.items || []).forEach(item => {
                // Only include Lumia items with definitions
                if (!item.lumiaDefName || !item.lumiaDef) return;
                const key = `${packName}:${item.lumiaDefName}`;
                if (existing.has(key)) return;

                items.push({
                    packName,
                    itemName: item.lumiaDefName,
                    displayName: item.lumiaDefName,
                    image: item.lumia_img,
                });
            });
        });

        // Filter by search term
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            return items.filter(item =>
                item.displayName.toLowerCase().includes(term) ||
                item.packName.toLowerCase().includes(term)
            );
        }

        return items;
    }, [packs, existingMembers, searchTerm]);

    return (
        <div className="lumiverse-council-add-dropdown">
            <div className="lumiverse-council-add-header">
                <input
                    type="text"
                    className="lumiverse-council-search"
                    placeholder="Search Lumias..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
                <button
                    className="lumiverse-council-btn"
                    onClick={onClose}
                    title="Close"
                    type="button"
                >
                    <X size={16} strokeWidth={2} />
                </button>
            </div>
            <div className="lumiverse-council-add-list">
                {availableItems.length === 0 ? (
                    <div className="lumiverse-council-add-empty">
                        {searchTerm ? 'No matching Lumias found' : 'All Lumias are already in the council'}
                    </div>
                ) : (
                    availableItems.map((item, index) => (
                        <button
                            key={`${item.packName}:${item.itemName}`}
                            className="lumiverse-council-add-item"
                            onClick={() => {
                                onAdd({ packName: item.packName, itemName: item.itemName });
                                onClose();
                            }}
                            type="button"
                        >
                            <div className="lumiverse-council-add-item-avatar">
                                {item.image ? (
                                    <img src={item.image} alt={item.displayName} />
                                ) : (
                                    <Users size={16} />
                                )}
                            </div>
                            <div className="lumiverse-council-add-item-info">
                                <span className="lumiverse-council-add-item-name">{item.displayName}</span>
                                <span className="lumiverse-council-add-item-pack">{item.packName}</span>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

/**
 * Empty state component
 */
function EmptyState() {
    return (
        <div className="lumiverse-council-empty">
            <span className="lumiverse-council-empty-icon">
                <Users size={32} strokeWidth={1.5} />
            </span>
            <h4>No Council Members</h4>
            <p>Add Lumias to your council to create a collaborative group of independent characters.</p>
        </div>
    );
}

/**
 * Main Council Manager component
 */
function CouncilManager() {
    const actions = useLumiverseActions();
    const { allPacks } = usePacks();
    const [isAddingMember, setIsAddingMember] = useState(false);

    // Subscribe to council state
    const councilMode = useSyncExternalStore(
        store.subscribe,
        selectCouncilMode,
        selectCouncilMode
    );
    const councilMembers = useSyncExternalStore(
        store.subscribe,
        selectCouncilMembers,
        selectCouncilMembers
    );

    const handleAddMember = useCallback((member) => {
        actions.addCouncilMember(member);
        saveToExtension();
    }, [actions]);

    const handleUpdateMember = useCallback((memberId, updates) => {
        actions.updateCouncilMember(memberId, updates);
        saveToExtension();
    }, [actions]);

    const handleRemoveMember = useCallback((memberId) => {
        actions.removeCouncilMember(memberId);
        saveToExtension();
    }, [actions]);

    const handleToggleCouncilMode = useCallback((enabled) => {
        actions.setCouncilMode(enabled);
        saveToExtension();
    }, [actions]);

    // Build packs object for lookups
    const packsObj = useMemo(() => {
        if (Array.isArray(allPacks)) {
            return allPacks.reduce((acc, p) => ({ ...acc, [p.name]: p }), {});
        }
        return allPacks || {};
    }, [allPacks]);

    return (
        <div className="lumiverse-council-manager">
            {/* Header with mode toggle */}
            <div className="lumiverse-council-header">
                <h3 className="lumiverse-council-title">
                    <Users size={18} strokeWidth={1.5} />
                    Council of Lumiae
                </h3>
                <label className="lumiverse-council-mode-toggle">
                    <input
                        type="checkbox"
                        checked={councilMode}
                        onChange={(e) => handleToggleCouncilMode(e.target.checked)}
                    />
                    <span className={clsx('lumiverse-council-mode-switch', councilMode && 'lumiverse-council-mode-switch--on')}>
                        <span className="lumiverse-council-mode-thumb" />
                    </span>
                    <span className="lumiverse-council-mode-label">
                        {councilMode ? 'Active' : 'Inactive'}
                    </span>
                </label>
            </div>

            {/* Mode description */}
            <p className="lumiverse-council-desc">
                Create a council of independent Lumias that collaborate, each with their own identity, behaviors, and personalities.
            </p>

            {/* Add member button / dropdown */}
            <div className="lumiverse-council-add-section">
                {isAddingMember ? (
                    <AddMemberDropdown
                        packs={packsObj}
                        existingMembers={councilMembers}
                        onAdd={handleAddMember}
                        onClose={() => setIsAddingMember(false)}
                    />
                ) : (
                    <button
                        className="lumiverse-council-add-btn"
                        onClick={() => setIsAddingMember(true)}
                        disabled={!councilMode}
                        title={councilMode ? 'Add a council member' : 'Enable Council Mode first'}
                        type="button"
                    >
                        <Plus size={16} strokeWidth={2} />
                        <span>Add Council Member</span>
                    </button>
                )}
            </div>

            {/* Council members list */}
            <div className="lumiverse-council-members">
                {councilMembers.length === 0 ? (
                    <EmptyState />
                ) : (
                    councilMembers.map((member) => (
                        <CouncilMemberCard
                            key={member.id}
                            member={member}
                            packs={packsObj}
                            onUpdate={handleUpdateMember}
                            onRemove={handleRemoveMember}
                        />
                    ))
                )}
            </div>

            {/* Help text */}
            {councilMembers.length > 0 && (
                <div className="lumiverse-council-help">
                    <p>
                        Council members will each appear with their definition in the <code>{'{{lumiaDef}}'}</code> macro output.
                        Their behaviors and personalities will be grouped per member.
                    </p>
                </div>
            )}
        </div>
    );
}

export default CouncilManager;
