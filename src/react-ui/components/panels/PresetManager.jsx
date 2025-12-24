import React, { useState, useMemo, useSyncExternalStore, useCallback } from 'react';
import clsx from 'clsx';
import { Bookmark, Trash2, RefreshCw, Plus, Check, X, Clock } from 'lucide-react';
import { useLumiverseStore, useLumiverseActions, saveToExtension } from '../../store/LumiverseContext';

/**
 * Format a timestamp to a relative time string
 */
function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

/**
 * Preset card component
 */
function PresetCard({ preset, isActive, onLoad, onUpdate, onDelete }) {
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const handleDelete = () => {
        if (isConfirmingDelete) {
            onDelete(preset.name);
            setIsConfirmingDelete(false);
        } else {
            setIsConfirmingDelete(true);
            // Auto-cancel after 3 seconds
            setTimeout(() => setIsConfirmingDelete(false), 3000);
        }
    };

    const traitCount =
        (preset.selectedDefinition ? 1 : 0) +
        (preset.selectedBehaviors?.length || 0) +
        (preset.selectedPersonalities?.length || 0);

    return (
        <div className={clsx('lumiverse-preset-card', isActive && 'lumiverse-preset-card--active')}>
            <div className="lumiverse-preset-card-header">
                <span className="lumiverse-preset-card-icon">
                    <Bookmark size={16} strokeWidth={1.5} />
                </span>
                <span className="lumiverse-preset-card-name">{preset.name}</span>
                {isActive && (
                    <span className="lumiverse-preset-card-active-badge">
                        <Check size={12} strokeWidth={2} /> Active
                    </span>
                )}
            </div>

            <div className="lumiverse-preset-card-meta">
                <span className="lumiverse-preset-card-traits">
                    {traitCount} trait{traitCount !== 1 ? 's' : ''}
                </span>
                {preset.chimeraMode && (
                    <span className="lumiverse-preset-card-mode">Chimera</span>
                )}
                {preset.councilMode && (
                    <span className="lumiverse-preset-card-mode">Council</span>
                )}
                <span className="lumiverse-preset-card-time">
                    <Clock size={12} strokeWidth={1.5} />
                    {formatRelativeTime(preset.updatedAt || preset.createdAt)}
                </span>
            </div>

            <div className="lumiverse-preset-card-actions">
                <button
                    className="lumiverse-preset-btn lumiverse-preset-btn--primary"
                    onClick={() => onLoad(preset.name)}
                    title="Load this preset"
                    type="button"
                >
                    Load
                </button>
                <button
                    className="lumiverse-preset-btn"
                    onClick={() => onUpdate(preset.name)}
                    title="Update preset with current selections"
                    type="button"
                >
                    <RefreshCw size={14} strokeWidth={1.5} />
                </button>
                <button
                    className={clsx(
                        'lumiverse-preset-btn lumiverse-preset-btn--danger',
                        isConfirmingDelete && 'lumiverse-preset-btn--confirming'
                    )}
                    onClick={handleDelete}
                    title={isConfirmingDelete ? 'Click again to confirm' : 'Delete preset'}
                    type="button"
                >
                    {isConfirmingDelete ? <X size={14} strokeWidth={2} /> : <Trash2 size={14} strokeWidth={1.5} />}
                </button>
            </div>
        </div>
    );
}

/**
 * Empty state component
 */
function EmptyState() {
    return (
        <div className="lumiverse-preset-empty">
            <span className="lumiverse-preset-empty-icon">
                <Bookmark size={32} strokeWidth={1.5} />
            </span>
            <h4>No Presets Saved</h4>
            <p>Save your current Lumia configuration as a preset to quickly switch between setups.</p>
        </div>
    );
}

/**
 * Main Preset Manager component
 */
function PresetManager() {
    const store = useLumiverseStore;
    const actions = useLumiverseActions();
    const [newPresetName, setNewPresetName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Subscribe to presets and activePresetName
    const presets = useSyncExternalStore(
        store.subscribe,
        () => store.getState().presets || {},
        () => store.getState().presets || {}
    );

    const activePresetName = useSyncExternalStore(
        store.subscribe,
        () => store.getState().activePresetName,
        () => store.getState().activePresetName
    );

    // Convert presets object to sorted array
    const presetList = useMemo(() => {
        return Object.values(presets).sort((a, b) => {
            // Sort by most recently updated/created
            const timeA = a.updatedAt || a.createdAt || 0;
            const timeB = b.updatedAt || b.createdAt || 0;
            return timeB - timeA;
        });
    }, [presets]);

    const handleLoad = useCallback((presetName) => {
        actions.loadPreset(presetName);
        saveToExtension();
    }, [actions]);

    const handleUpdate = useCallback((presetName) => {
        actions.updatePreset(presetName);
        saveToExtension();
    }, [actions]);

    const handleDelete = useCallback((presetName) => {
        actions.deletePreset(presetName);
        saveToExtension();
    }, [actions]);

    const handleCreate = useCallback(() => {
        const trimmedName = newPresetName.trim();
        if (!trimmedName) return;

        // Check for duplicate names
        if (presets[trimmedName]) {
            // Could show a toast/error here
            return;
        }

        actions.savePreset(trimmedName);
        saveToExtension();
        setNewPresetName('');
        setIsCreating(false);
    }, [newPresetName, presets, actions]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCreate();
        } else if (e.key === 'Escape') {
            setIsCreating(false);
            setNewPresetName('');
        }
    };

    return (
        <div className="lumiverse-preset-manager">
            {/* Header with create button */}
            <div className="lumiverse-preset-header">
                <h3 className="lumiverse-preset-title">Lumia Presets</h3>
                {!isCreating ? (
                    <button
                        className="lumiverse-preset-create-btn"
                        onClick={() => setIsCreating(true)}
                        title="Save current configuration as preset"
                        type="button"
                    >
                        <Plus size={16} strokeWidth={2} />
                        <span>New Preset</span>
                    </button>
                ) : (
                    <div className="lumiverse-preset-create-form">
                        <input
                            type="text"
                            className="lumiverse-preset-input"
                            placeholder="Preset name..."
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        <button
                            className="lumiverse-preset-btn lumiverse-preset-btn--primary"
                            onClick={handleCreate}
                            disabled={!newPresetName.trim()}
                            type="button"
                        >
                            <Check size={14} strokeWidth={2} />
                        </button>
                        <button
                            className="lumiverse-preset-btn"
                            onClick={() => {
                                setIsCreating(false);
                                setNewPresetName('');
                            }}
                            type="button"
                        >
                            <X size={14} strokeWidth={2} />
                        </button>
                    </div>
                )}
            </div>

            {/* Preset list */}
            <div className="lumiverse-preset-list">
                {presetList.length === 0 ? (
                    <EmptyState />
                ) : (
                    presetList.map((preset) => (
                        <PresetCard
                            key={preset.name}
                            preset={preset}
                            isActive={activePresetName === preset.name}
                            onLoad={handleLoad}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>

            {/* Help text */}
            {presetList.length > 0 && (
                <div className="lumiverse-preset-help">
                    <p>Presets save your Lumia selections (definition, behaviors, personalities) and mode settings.</p>
                </div>
            )}
        </div>
    );
}

export default PresetManager;
