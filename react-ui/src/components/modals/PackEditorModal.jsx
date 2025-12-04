import React, { useState, useCallback } from 'react';
import { usePacks, useLumiverseActions } from '../../store/LumiverseContext';
import clsx from 'clsx';

/**
 * Form input with label
 */
function FormField({ label, required, children, error }) {
    return (
        <div className={clsx('lumiverse-form-field', error && 'lumiverse-form-field--error')}>
            <label className="lumiverse-form-label">
                {label}
                {required && <span className="lumiverse-required">*</span>}
            </label>
            {children}
            {error && <span className="lumiverse-form-error">{error}</span>}
        </div>
    );
}

/**
 * Text input component
 */
function TextInput({ value, onChange, placeholder, maxLength }) {
    return (
        <input
            type="text"
            className="lumiverse-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
        />
    );
}

/**
 * Textarea component
 */
function TextArea({ value, onChange, placeholder, rows = 3 }) {
    return (
        <textarea
            className="lumiverse-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
        />
    );
}

/**
 * Image URL input with preview
 */
function ImageInput({ value, onChange, placeholder }) {
    const [previewError, setPreviewError] = useState(false);

    const handleChange = (newValue) => {
        setPreviewError(false);
        onChange(newValue);
    };

    return (
        <div className="lumiverse-image-input">
            <input
                type="text"
                className="lumiverse-input"
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder || 'Enter image URL...'}
            />
            {value && !previewError && (
                <div className="lumiverse-image-preview">
                    <img
                        src={value}
                        alt="Preview"
                        onError={() => setPreviewError(true)}
                    />
                </div>
            )}
            {previewError && (
                <span className="lumiverse-image-error">Failed to load image</span>
            )}
        </div>
    );
}

/**
 * Lumia item editor within pack
 */
function LumiaItemEditor({ item, onUpdate, onRemove }) {
    return (
        <div className="lumiverse-lumia-editor">
            <div className="lumiverse-lumia-header">
                <span className="lumiverse-lumia-type">{item.type || 'Definition'}</span>
                <button
                    className="lumiverse-btn lumiverse-btn--danger lumiverse-btn--icon"
                    onClick={onRemove}
                    title="Remove item"
                    type="button"
                >
                    🗑️
                </button>
            </div>

            <div className="lumiverse-lumia-fields">
                <FormField label="Name" required>
                    <TextInput
                        value={item.name || ''}
                        onChange={(val) => onUpdate({ ...item, name: val })}
                        placeholder="Item name"
                    />
                </FormField>

                <FormField label="Image URL">
                    <ImageInput
                        value={item.image || ''}
                        onChange={(val) => onUpdate({ ...item, image: val })}
                    />
                </FormField>

                <FormField label="Description">
                    <TextArea
                        value={item.description || ''}
                        onChange={(val) => onUpdate({ ...item, description: val })}
                        placeholder="Describe this item..."
                    />
                </FormField>

                <FormField label="Content" required>
                    <TextArea
                        value={item.content || ''}
                        onChange={(val) => onUpdate({ ...item, content: val })}
                        placeholder="The actual content/definition..."
                        rows={5}
                    />
                </FormField>

                <FormField label="Type">
                    <select
                        className="lumiverse-select"
                        value={item.type || ''}
                        onChange={(e) => onUpdate({ ...item, type: e.target.value })}
                    >
                        <option value="">Definition</option>
                        <option value="behaviors">Behavior</option>
                        <option value="personalities">Personality</option>
                    </select>
                </FormField>
            </div>
        </div>
    );
}

/**
 * Generate a unique ID for new items
 */
function generateId() {
    return `lumia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Pack Editor Modal component
 * For creating and editing custom packs
 */
function PackEditorModal({ packId, onClose }) {
    const { customPacks } = usePacks();
    const actions = useLumiverseActions();

    // Find existing pack if editing
    const existingPack = packId
        ? customPacks.find((p) => p.id === packId)
        : null;

    // Local state for the pack being edited
    const [pack, setPack] = useState(
        existingPack || {
            id: generateId(),
            name: '',
            author: '',
            coverImage: '',
            description: '',
            isCustom: true,
            items: [],
        }
    );

    const [errors, setErrors] = useState({});

    // Update pack field
    const updatePack = useCallback((field, value) => {
        setPack((prev) => ({ ...prev, [field]: value }));
        // Clear error when field is updated
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    }, [errors]);

    // Add new Lumia item
    const addItem = useCallback(() => {
        const newItem = {
            id: generateId(),
            name: '',
            image: '',
            description: '',
            content: '',
            type: '',
        };
        setPack((prev) => ({
            ...prev,
            items: [...prev.items, newItem],
        }));
    }, []);

    // Update specific item
    const updateItem = useCallback((index, updatedItem) => {
        setPack((prev) => ({
            ...prev,
            items: prev.items.map((item, i) => (i === index ? updatedItem : item)),
        }));
    }, []);

    // Remove item
    const removeItem = useCallback((index) => {
        setPack((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    }, []);

    // Validate pack
    const validate = () => {
        const newErrors = {};

        if (!pack.name.trim()) {
            newErrors.name = 'Pack name is required';
        }

        // Validate items
        pack.items.forEach((item, index) => {
            if (!item.name.trim()) {
                newErrors[`item_${index}_name`] = 'Item name is required';
            }
            if (!item.content.trim()) {
                newErrors[`item_${index}_content`] = 'Item content is required';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Save pack
    const handleSave = () => {
        if (!validate()) {
            return;
        }

        if (existingPack) {
            actions.updateCustomPack(pack.id, pack);
        } else {
            actions.addCustomPack(pack);
        }

        onClose();
    };

    // Delete pack
    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete "${pack.name}"?`)) {
            actions.removeCustomPack(pack.id);
            onClose();
        }
    };

    return (
        <div className="lumiverse-pack-editor-modal">
            <div className="lumiverse-pack-editor-content">
                {/* Pack Metadata Section */}
                <div className="lumiverse-pack-metadata">
                    <h3>Pack Details</h3>

                    <FormField label="Pack Name" required error={errors.name}>
                        <TextInput
                            value={pack.name}
                            onChange={(val) => updatePack('name', val)}
                            placeholder="My Custom Pack"
                        />
                    </FormField>

                    <FormField label="Author">
                        <TextInput
                            value={pack.author}
                            onChange={(val) => updatePack('author', val)}
                            placeholder="Your name"
                        />
                    </FormField>

                    <FormField label="Cover Image">
                        <ImageInput
                            value={pack.coverImage}
                            onChange={(val) => updatePack('coverImage', val)}
                        />
                    </FormField>

                    <FormField label="Description">
                        <TextArea
                            value={pack.description}
                            onChange={(val) => updatePack('description', val)}
                            placeholder="Describe what this pack contains..."
                        />
                    </FormField>
                </div>

                {/* Lumia Items Section */}
                <div className="lumiverse-pack-items-section">
                    <div className="lumiverse-pack-items-header">
                        <h3>Lumia Items ({pack.items.length})</h3>
                        <button
                            className="lumiverse-btn lumiverse-btn--primary"
                            onClick={addItem}
                            type="button"
                        >
                            + Add Item
                        </button>
                    </div>

                    {pack.items.length === 0 ? (
                        <div className="lumiverse-empty-state">
                            <span className="lumiverse-empty-icon">📝</span>
                            <p>No items yet</p>
                            <p className="lumiverse-empty-hint">
                                Add behaviors, personalities, or definitions to your pack
                            </p>
                        </div>
                    ) : (
                        <div className="lumiverse-pack-items-list">
                            {pack.items.map((item, index) => (
                                <LumiaItemEditor
                                    key={item.id}
                                    item={item}
                                    onUpdate={(updated) => updateItem(index, updated)}
                                    onRemove={() => removeItem(index)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="lumiverse-pack-editor-footer">
                {existingPack && (
                    <button
                        className="lumiverse-btn lumiverse-btn--danger"
                        onClick={handleDelete}
                        type="button"
                    >
                        Delete Pack
                    </button>
                )}
                <div className="lumiverse-pack-editor-actions">
                    <button
                        className="lumiverse-btn lumiverse-btn--secondary"
                        onClick={onClose}
                        type="button"
                    >
                        Cancel
                    </button>
                    <button
                        className="lumiverse-btn lumiverse-btn--primary"
                        onClick={handleSave}
                        type="button"
                    >
                        {existingPack ? 'Save Changes' : 'Create Pack'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PackEditorModal;
