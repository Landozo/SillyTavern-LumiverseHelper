/**
 * UI Modals Module
 * Handles all modal dialog rendering and interaction for Lumia Injector
 */

import { getSettings, saveSettings, MODULE_NAME } from './settingsManager.js';
import { getItemFromLibrary, escapeHtml } from './dataProcessor.js';
import { generateLoomSummary, getProviderDefaults } from './summarization.js';

// Note: processAllLumiaOOCComments is imported dynamically to avoid circular dependency
let processAllLumiaOOCCommentsRef = null;

/**
 * Set the processAllLumiaOOCComments function reference
 * Called by index.js after all modules are loaded
 * @param {Function} fn - The function reference
 */
export function setProcessAllLumiaOOCCommentsRef(fn) {
    processAllLumiaOOCCommentsRef = fn;
}

// Callback for UI refresh - set by index.js
let refreshUICallback = null;

/**
 * Set the refresh UI callback
 * @param {Function} callback - The callback function to call when UI needs refresh
 */
export function setRefreshUICallback(callback) {
    refreshUICallback = callback;
}

/**
 * Refresh the UI using the registered callback
 */
function refreshUI() {
    if (refreshUICallback) {
        refreshUICallback();
    }
}

/**
 * Show the selection modal for definitions, behaviors, or personalities
 * @param {string} type - 'definition' | 'behavior' | 'personality'
 */
export function showSelectionModal(type) {
    const settings = getSettings();
    const packs = Object.values(settings.packs);

    let title = "";
    let isMulti = false;

    if (type === 'definition') {
        title = "Select Definition";
        isMulti = false;
    } else if (type === 'behavior') {
        title = "Select Behaviors";
        isMulti = true;
    } else if (type === 'personality') {
        title = "Select Personalities";
        isMulti = true;
    }

    $("#lumia-selection-modal").remove();

    // Build HTML for each pack
    let contentHtml = "";

    if (packs.length === 0) {
        contentHtml = '<div class="lumia-empty">No Lumia Packs loaded. Add one in settings!</div>';
    } else {
        packs.forEach(pack => {
            const packItems = pack.items;
            if (!packItems || packItems.length === 0) return;

            // Render Items Grid
            const itemsHtml = packItems.map(item => {
                // Check selection
                let isSelected = false;
                const currentDefName = item.lumiaDefName;

                if (isMulti) {
                    const collection = type === 'behavior' ? settings.selectedBehaviors : settings.selectedPersonalities;
                    isSelected = collection.some(s => s.packName === pack.name && s.itemName === currentDefName);
                } else {
                    const sel = settings.selectedDefinition;
                    isSelected = sel && sel.packName === pack.name && sel.itemName === currentDefName;
                }

                const imgToShow = item.lumia_img;
                const escapedPackName = escapeHtml(pack.name);
                const escapedItemName = escapeHtml(currentDefName);

                return `
                <div class="lumia-grid-item ${isSelected ? 'selected' : ''}"
                     data-pack="${escapedPackName}"
                     data-item="${escapedItemName}">
                    <div class="lumia-item-image">
                        ${imgToShow ? `<img src="${imgToShow}" alt="${escapedItemName}">` : '<div class="lumia-placeholder-img">?</div>'}
                    </div>
                    <div class="lumia-item-name">${currentDefName || "Unknown"}</div>
                </div>
                `;
            }).join("");

            contentHtml += `
            <div class="lumia-pack-section">
                <div class="lumia-pack-header">
                    <h4>${pack.name} (${packItems.length})</h4>
                    <button class="menu_button red lumia-remove-pack-btn" data-pack="${escapeHtml(pack.name)}">Remove Pack</button>
                </div>
                <div class="lumia-grid">
                    ${itemsHtml}
                </div>
            </div>
            `;
        });
    }

    const modalHtml = `
        <dialog id="lumia-selection-modal" class="popup wide_dialogue_popup large_dialogue_popup vertical_scrolling_dialogue_popup popup--animation-fast">
            <div class="popup-header">
                <h3 style="margin: 0; padding: 10px 0;">${title}</h3>
            </div>
            <div class="popup-content" style="padding: 15px; flex: 1; display: flex; flex-direction: column;">
                ${contentHtml}
            </div>
            <div class="popup-footer" style="display: flex; justify-content: center; padding: 15px; gap: 10px;">
                ${isMulti ? '<button class="menu_button lumia-modal-done">Done</button>' : '<button class="menu_button lumia-modal-close-btn">Close</button>'}
            </div>
        </dialog>
    `;

    $("body").append(modalHtml);
    const $modal = $("#lumia-selection-modal");

    const closeModal = () => {
        $modal[0].close();
        $modal.remove();
        refreshUI();
    };

    $modal.find(".lumia-modal-close-btn, .lumia-modal-done").click(closeModal);

    $modal.on("click", function (e) {
        if (e.target === this) closeModal();
    });

    $modal.on("keydown", function (e) {
        if (e.key === "Escape") closeModal();
    });

    // Handle Remove Pack
    $modal.find(".lumia-remove-pack-btn").click(function(e) {
        e.stopPropagation();
        const packName = $(this).data("pack");
        if (confirm(`Are you sure you want to remove the pack "${packName}"?`)) {
            delete settings.packs[packName];

            // Clean up selections
            if (settings.selectedDefinition && settings.selectedDefinition.packName === packName) {
                settings.selectedDefinition = null;
            }
            settings.selectedBehaviors = settings.selectedBehaviors.filter(s => s.packName !== packName);
            settings.selectedPersonalities = settings.selectedPersonalities.filter(s => s.packName !== packName);

            saveSettings();

            $(this).closest(".lumia-pack-section").remove();

            if (Object.keys(settings.packs).length === 0) {
                closeModal();
            }
        }
    });

    // Handle Item Selection
    $modal.find(".lumia-grid-item").click(function() {
        const packName = $(this).data("pack");
        const itemName = $(this).data("item");

        if (!isMulti) {
            settings.selectedDefinition = { packName, itemName };
            saveSettings();
            closeModal();
        } else {
            const $this = $(this);
            let collection = (type === 'behavior') ? settings.selectedBehaviors : settings.selectedPersonalities;

            const existsIdx = collection.findIndex(s => s.packName === packName && s.itemName === itemName);

            if (existsIdx !== -1) {
                // Remove
                collection.splice(existsIdx, 1);
                $this.removeClass('selected');
            } else {
                // Add
                collection.push({ packName, itemName });
                $this.addClass('selected');
            }

            if (type === 'behavior') settings.selectedBehaviors = collection;
            else settings.selectedPersonalities = collection;

            saveSettings();
        }
    });

    $modal[0].showModal();
}

/**
 * Show the miscellaneous features modal (OOC settings)
 */
export function showMiscFeaturesModal() {
    const settings = getSettings();

    $("#lumia-misc-modal").remove();

    const currentInterval = settings.lumiaOOCInterval || "";
    const currentStyle = settings.lumiaOOCStyle || 'social';

    const modalHtml = `
        <dialog id="lumia-misc-modal" class="popup wide_dialogue_popup large_dialogue_popup popup--animation-fast">
            <div class="popup-header">
                <h3 style="margin: 0; padding: 10px 0;">Miscellaneous Features</h3>
            </div>
            <div class="popup-content" style="padding: 15px; flex: 1; display: flex; flex-direction: column; gap: 20px;">

                <div class="lumia-misc-section">
                    <h4>OOC Comment Trigger</h4>
                    <p>Automatically inject OOC instructions when the chat reaches certain message intervals.</p>

                    <div class="lumia-item" style="margin-top: 10px;">
                        <label for="lumia-ooc-interval-input">Message Interval (leave empty to disable):</label>
                        <input type="number"
                               id="lumia-ooc-interval-input"
                               class="text_pole"
                               placeholder="e.g., 10"
                               min="1"
                               value="${escapeHtml(currentInterval.toString())}" />
                        <small>When the current message count is divisible by this number, the OOC instruction will trigger.</small>
                    </div>
                </div>

                <div class="lumia-misc-section">
                    <h4>OOC Comment Style</h4>
                    <p>Choose how Lumia's out-of-character comments are displayed in the chat.</p>

                    <div class="lumia-item" style="margin-top: 10px;">
                        <label for="lumia-ooc-style-select">Display Style:</label>
                        <select id="lumia-ooc-style-select" class="text_pole">
                            <option value="social" ${currentStyle === 'social' ? 'selected' : ''}>Social Card — Full card with avatar and ethereal animations</option>
                            <option value="margin" ${currentStyle === 'margin' ? 'selected' : ''}>Margin Note — Minimal Apple-esque hanging tag</option>
                            <option value="whisper" ${currentStyle === 'whisper' ? 'selected' : ''}>Whisper Bubble — Soft ethereal thought bubble</option>
                        </select>
                    </div>
                </div>

            </div>
            <div class="popup-footer" style="display: flex; justify-content: center; padding: 15px; gap: 10px;">
                <button class="menu_button lumia-misc-save-btn">Save</button>
                <button class="menu_button lumia-misc-cancel-btn">Cancel</button>
            </div>
        </dialog>
    `;

    $("body").append(modalHtml);
    const $modal = $("#lumia-misc-modal");

    const closeModal = () => {
        $modal[0].close();
        $modal.remove();
    };

    $modal.find(".lumia-misc-save-btn").click(() => {
        const intervalValue = $("#lumia-ooc-interval-input").val().trim();
        const styleValue = $("#lumia-ooc-style-select").val();
        const oldStyle = settings.lumiaOOCStyle;

        settings.lumiaOOCInterval = intervalValue ? parseInt(intervalValue, 10) : null;
        settings.lumiaOOCStyle = styleValue;

        saveSettings();
        toastr.success("Miscellaneous features saved!");
        closeModal();

        // If style changed, reprocess all OOC comments to apply new style
        if (oldStyle !== styleValue && processAllLumiaOOCCommentsRef) {
            setTimeout(() => processAllLumiaOOCCommentsRef(true), 100);
        }
    });

    $modal.find(".lumia-misc-cancel-btn").click(closeModal);

    $modal.on("click", function (e) {
        if (e.target === this) closeModal();
    });

    $modal.on("keydown", function (e) {
        if (e.key === "Escape") closeModal();
    });

    $modal[0].showModal();
}

/**
 * Show the Loom selection modal
 * @param {string} category - 'Narrative Style' | 'Loom Utilities' | 'Retrofits'
 */
export function showLoomSelectionModal(category) {
    const settings = getSettings();
    const packs = Object.values(settings.packs);

    let title = "";
    let isMulti = false;
    let settingsKey = null;

    if (category === 'Narrative Style') {
        title = "Select Narrative Style";
        isMulti = false;
        settingsKey = 'selectedLoomStyle';
    } else if (category === 'Loom Utilities') {
        title = "Select Loom Utilities";
        isMulti = true;
        settingsKey = 'selectedLoomUtils';
    } else if (category === 'Retrofits') {
        title = "Select Retrofits";
        isMulti = true;
        settingsKey = 'selectedLoomRetrofits';
    }

    $("#loom-selection-modal").remove();

    // Build HTML for each pack
    let contentHtml = "";

    if (packs.length === 0) {
        contentHtml = '<div class="lumia-empty">No Packs loaded. Add one in settings!</div>';
    } else {
        packs.forEach(pack => {
            const packItems = pack.items;
            if (!packItems || packItems.length === 0) return;

            // Filter items by category
            const categoryItems = packItems.filter(item => item.loomCategory === category);
            if (categoryItems.length === 0) return;

            // Render Items Grid (simpler for Loom - no images)
            const itemsHtml = categoryItems.map(item => {
                // Check selection
                let isSelected = false;
                const currentItemName = item.loomName;

                if (isMulti) {
                    const collection = settings[settingsKey];
                    isSelected = collection.some(s => s.packName === pack.name && s.itemName === currentItemName);
                } else {
                    const sel = settings[settingsKey];
                    isSelected = sel && sel.packName === pack.name && sel.itemName === currentItemName;
                }

                const escapedPackName = escapeHtml(pack.name);
                const escapedItemName = escapeHtml(currentItemName);

                return `
                <div class="lumia-grid-item ${isSelected ? 'selected' : ''}"
                     data-pack="${escapedPackName}"
                     data-item="${escapedItemName}">
                    <div class="lumia-item-name">${currentItemName || "Unknown"}</div>
                </div>
                `;
            }).join("");

            if (itemsHtml) {
                contentHtml += `
                <div class="lumia-pack-section">
                    <div class="lumia-pack-header">
                        <h4>${pack.name} - ${category} (${categoryItems.length})</h4>
                    </div>
                    <div class="lumia-grid">
                        ${itemsHtml}
                    </div>
                </div>
                `;
            }
        });

        if (!contentHtml) {
            contentHtml = `<div class="lumia-empty">No "${category}" items found in loaded packs.</div>`;
        }
    }

    const modalHtml = `
        <dialog id="loom-selection-modal" class="popup wide_dialogue_popup large_dialogue_popup vertical_scrolling_dialogue_popup popup--animation-fast">
            <div class="popup-header">
                <h3 style="margin: 0; padding: 10px 0;">${title}</h3>
            </div>
            <div class="popup-content" style="padding: 15px; flex: 1; display: flex; flex-direction: column;">
                ${contentHtml}
            </div>
            <div class="popup-footer" style="display: flex; justify-content: center; padding: 15px; gap: 10px;">
                ${isMulti ? '<button class="menu_button loom-modal-done">Done</button>' : '<button class="menu_button loom-modal-close-btn">Close</button>'}
            </div>
        </dialog>
    `;

    $("body").append(modalHtml);
    const $modal = $("#loom-selection-modal");

    const closeModal = () => {
        $modal[0].close();
        $modal.remove();
        refreshUI();
    };

    $modal.find(".loom-modal-close-btn, .loom-modal-done").click(closeModal);

    $modal.on("click", function (e) {
        if (e.target === this) closeModal();
    });

    $modal.on("keydown", function (e) {
        if (e.key === "Escape") closeModal();
    });

    // Handle Item Selection
    $modal.find(".lumia-grid-item").click(function() {
        const packName = $(this).data("pack");
        const itemName = $(this).data("item");

        if (!isMulti) {
            settings[settingsKey] = { packName, itemName };
            saveSettings();
            closeModal();
        } else {
            const $this = $(this);
            let collection = settings[settingsKey];

            const existsIdx = collection.findIndex(s => s.packName === packName && s.itemName === itemName);

            if (existsIdx !== -1) {
                // Remove
                collection.splice(existsIdx, 1);
                $this.removeClass('selected');
            } else {
                // Add
                collection.push({ packName, itemName });
                $this.addClass('selected');
            }

            settings[settingsKey] = collection;
            saveSettings();
        }
    });

    $modal[0].showModal();
}

/**
 * Show the summarization settings modal
 */
export function showSummarizationModal() {
    const settings = getSettings();

    $("#lumia-summarization-modal").remove();

    const sumSettings = settings.summarization || {};
    const secondary = sumSettings.secondary || {};

    const currentMode = sumSettings.mode || 'disabled';
    const currentSource = sumSettings.apiSource || 'main';
    const currentInterval = sumSettings.autoInterval || 10;
    const currentAutoContext = sumSettings.autoMessageContext || 10;
    const currentManualContext = sumSettings.manualMessageContext || 10;
    const currentProvider = secondary.provider || 'openai';
    const currentModel = secondary.model || '';
    const currentEndpoint = secondary.endpoint || '';
    const currentApiKey = secondary.apiKey || '';
    const currentTemp = secondary.temperature || 0.7;
    const currentTopP = secondary.topP !== undefined ? secondary.topP : 1.0;
    const currentMaxTokens = secondary.maxTokens || 8192;

    const providerDefaults = getProviderDefaults(currentProvider);

    const modalHtml = `
        <dialog id="lumia-summarization-modal" class="popup wide_dialogue_popup large_dialogue_popup vertical_scrolling_dialogue_popup popup--animation-fast">
            <div class="popup-header">
                <h3 style="margin: 0; padding: 10px 0;">Summarization Settings</h3>
            </div>
            <div class="popup-content" style="padding: 15px; flex: 1; display: flex; flex-direction: column; gap: 20px;">

                <div class="lumia-misc-section">
                    <h4>Summarization Mode</h4>
                    <p>Choose how summarization is triggered:</p>
                    <div class="lumia-item" style="margin-top: 10px;">
                        <select id="lumia-sum-mode-select" class="text_pole">
                            <option value="disabled" ${currentMode === 'disabled' ? 'selected' : ''}>Disabled</option>
                            <option value="auto" ${currentMode === 'auto' ? 'selected' : ''}>Automatic (interval-based)</option>
                            <option value="manual" ${currentMode === 'manual' ? 'selected' : ''}>Manual only (slash command)</option>
                        </select>
                    </div>
                </div>

                <div class="lumia-misc-section" id="lumia-sum-auto-section" style="${currentMode === 'auto' ? '' : 'display: none;'}">
                    <h4>Auto-Summarization Settings</h4>
                    <div class="lumia-item" style="margin-top: 10px;">
                        <label for="lumia-sum-interval-input">Message Interval:</label>
                        <input type="number" id="lumia-sum-interval-input" class="text_pole" min="1" value="${currentInterval}" />
                        <small style="color: #888;">Generate a summary every N messages</small>
                    </div>
                    <div class="lumia-item" style="margin-top: 10px;">
                        <label for="lumia-sum-auto-context-input">Auto Message Context:</label>
                        <input type="number" id="lumia-sum-auto-context-input" class="text_pole" min="1" max="100" value="${currentAutoContext}" />
                        <small style="color: #888;">Number of recent messages to include for automatic summaries</small>
                    </div>
                </div>

                <div class="lumia-misc-section" id="lumia-sum-manual-section" style="${currentMode === 'manual' || currentMode === 'auto' ? '' : 'display: none;'}">
                    <h4>Manual Summarization Context</h4>
                    <div class="lumia-item" style="margin-top: 10px;">
                        <label for="lumia-sum-manual-context-input">Manual Message Context:</label>
                        <input type="number" id="lumia-sum-manual-context-input" class="text_pole" min="1" max="100" value="${currentManualContext}" />
                        <small style="color: #888;">Number of recent messages to include when using /loom-summarize command</small>
                    </div>
                </div>

                <div class="lumia-misc-section">
                    <h4>API Source</h4>
                    <p>Choose which API to use for summarization:</p>
                    <div class="lumia-item" style="margin-top: 10px;">
                        <select id="lumia-sum-source-select" class="text_pole">
                            <option value="main" ${currentSource === 'main' ? 'selected' : ''}>Main API (SillyTavern's current connection)</option>
                            <option value="secondary" ${currentSource === 'secondary' ? 'selected' : ''}>Secondary LLM (custom endpoint)</option>
                        </select>
                    </div>
                </div>

                <div class="lumia-misc-section" id="lumia-sum-secondary-section" style="${currentSource === 'secondary' ? '' : 'display: none;'}">
                    <h4>Secondary LLM Configuration</h4>

                    <div class="lumia-item" style="margin-top: 10px;">
                        <label for="lumia-sum-provider-select">Provider:</label>
                        <select id="lumia-sum-provider-select" class="text_pole">
                            <option value="openai" ${currentProvider === 'openai' ? 'selected' : ''}>OpenAI</option>
                            <option value="anthropic" ${currentProvider === 'anthropic' ? 'selected' : ''}>Anthropic (Claude)</option>
                            <option value="openrouter" ${currentProvider === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
                            <option value="custom" ${currentProvider === 'custom' ? 'selected' : ''}>Custom OpenAI-Compatible</option>
                        </select>
                    </div>

                    <div class="lumia-item" style="margin-top: 10px;">
                        <label for="lumia-sum-model-input">Model:</label>
                        <input type="text" id="lumia-sum-model-input" class="text_pole"
                               placeholder="${providerDefaults.placeholder}"
                               value="${escapeHtml(currentModel)}" />
                    </div>

                    <div class="lumia-item" style="margin-top: 10px;">
                        <label for="lumia-sum-endpoint-input">Endpoint URL:</label>
                        <input type="text" id="lumia-sum-endpoint-input" class="text_pole"
                               placeholder="${providerDefaults.endpoint}"
                               value="${escapeHtml(currentEndpoint)}" />
                        <small style="color: #888;">Leave empty to use provider's default endpoint</small>
                    </div>

                    <div class="lumia-item" style="margin-top: 10px;">
                        <label for="lumia-sum-apikey-input">API Key:</label>
                        <input type="password" id="lumia-sum-apikey-input" class="text_pole"
                               placeholder="Your API key"
                               value="${escapeHtml(currentApiKey)}" />
                    </div>

                    <div class="lumia-item" style="margin-top: 10px;">
                        <label for="lumia-sum-temp-input">Temperature:</label>
                        <input type="number" id="lumia-sum-temp-input" class="text_pole"
                               min="0" max="2" step="0.1" value="${currentTemp}" />
                    </div>

                    <div class="lumia-item" style="margin-top: 10px;">
                        <label for="lumia-sum-topp-input">Top-P:</label>
                        <input type="number" id="lumia-sum-topp-input" class="text_pole"
                               min="0" max="1" step="0.05" value="${currentTopP}" />
                        <small style="color: #888;">Nucleus sampling (0-1). 1.0 = disabled</small>
                    </div>

                    <div class="lumia-item" style="margin-top: 10px;">
                        <label for="lumia-sum-maxtokens-input">Max Response Length:</label>
                        <input type="text" id="lumia-sum-maxtokens-input" class="text_pole"
                               value="${currentMaxTokens}" />
                        <small style="color: #888;">Maximum tokens in response (numbers only, default: 8192)</small>
                    </div>
                </div>

                <div class="lumia-misc-section">
                    <h4>Test Summarization</h4>
                    <p>Generate a summary now to test your configuration:</p>
                    <button id="lumia-sum-test-btn" class="menu_button">Generate Summary Now</button>
                    <div id="lumia-sum-test-status" style="margin-top: 10px; font-style: italic; color: #888;"></div>
                </div>

            </div>
            <div class="popup-footer" style="display: flex; justify-content: center; padding: 15px; gap: 10px;">
                <button class="menu_button lumia-sum-save-btn">Save</button>
                <button class="menu_button lumia-sum-cancel-btn">Cancel</button>
            </div>
        </dialog>
    `;

    $("body").append(modalHtml);
    const $modal = $("#lumia-summarization-modal");

    const closeModal = () => {
        $modal[0].close();
        $modal.remove();
    };

    // Show/hide sections based on mode
    $modal.find("#lumia-sum-mode-select").change(function() {
        const mode = $(this).val();
        if (mode === 'auto') {
            $modal.find("#lumia-sum-auto-section").show();
            $modal.find("#lumia-sum-manual-section").show();
        } else if (mode === 'manual') {
            $modal.find("#lumia-sum-auto-section").hide();
            $modal.find("#lumia-sum-manual-section").show();
        } else {
            $modal.find("#lumia-sum-auto-section").hide();
            $modal.find("#lumia-sum-manual-section").hide();
        }
    });

    // Show/hide secondary LLM section based on source
    $modal.find("#lumia-sum-source-select").change(function() {
        const source = $(this).val();
        if (source === 'secondary') {
            $modal.find("#lumia-sum-secondary-section").show();
        } else {
            $modal.find("#lumia-sum-secondary-section").hide();
        }
    });

    // Update placeholders when provider changes
    $modal.find("#lumia-sum-provider-select").change(function() {
        const provider = $(this).val();
        const defaults = getProviderDefaults(provider);
        $modal.find("#lumia-sum-model-input").attr("placeholder", defaults.placeholder);
        $modal.find("#lumia-sum-endpoint-input").attr("placeholder", defaults.endpoint);
    });

    // Helper to parse and validate maxTokens
    const parseMaxTokens = (val) => {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed) || !/^\d+$/.test(String(val).trim())) {
            return 8192;
        }
        return Math.max(256, parsed);
    };

    // Test button
    $modal.find("#lumia-sum-test-btn").click(async function() {
        const $status = $modal.find("#lumia-sum-test-status");
        $status.text("Generating summary...");

        try {
            // Temporarily apply current form values (test uses manual context since it's a manual action)
            const tempSettings = {
                mode: $modal.find("#lumia-sum-mode-select").val(),
                apiSource: $modal.find("#lumia-sum-source-select").val(),
                autoInterval: parseInt($modal.find("#lumia-sum-interval-input").val()) || 10,
                autoMessageContext: parseInt($modal.find("#lumia-sum-auto-context-input").val()) || 10,
                manualMessageContext: parseInt($modal.find("#lumia-sum-manual-context-input").val()) || 10,
                secondary: {
                    provider: $modal.find("#lumia-sum-provider-select").val(),
                    model: $modal.find("#lumia-sum-model-input").val(),
                    endpoint: $modal.find("#lumia-sum-endpoint-input").val(),
                    apiKey: $modal.find("#lumia-sum-apikey-input").val(),
                    temperature: parseFloat($modal.find("#lumia-sum-temp-input").val()) || 0.7,
                    topP: parseFloat($modal.find("#lumia-sum-topp-input").val()) || 1.0,
                    maxTokens: parseMaxTokens($modal.find("#lumia-sum-maxtokens-input").val())
                }
            };

            const result = await generateLoomSummary(tempSettings, true);
            if (result) {
                $status.html(`<span style="color: #4CAF50;">Summary generated successfully!</span><br><small>Check your chat metadata.</small>`);
                toastr.success("Summary generated and saved to chat metadata!");
            } else {
                $status.html(`<span style="color: #f44336;">No summary generated. Check console for details.</span>`);
            }
        } catch (error) {
            console.error(`[${MODULE_NAME}] Summarization error:`, error);
            $status.html(`<span style="color: #f44336;">Error: ${error.message}</span>`);
        }
    });

    // Save button
    $modal.find(".lumia-sum-save-btn").click(() => {
        const maxTokensVal = parseMaxTokens($modal.find("#lumia-sum-maxtokens-input").val());

        $modal.find("#lumia-sum-maxtokens-input").val(maxTokensVal);

        settings.summarization = {
            mode: $modal.find("#lumia-sum-mode-select").val(),
            apiSource: $modal.find("#lumia-sum-source-select").val(),
            autoInterval: parseInt($modal.find("#lumia-sum-interval-input").val()) || 10,
            autoMessageContext: parseInt($modal.find("#lumia-sum-auto-context-input").val()) || 10,
            manualMessageContext: parseInt($modal.find("#lumia-sum-manual-context-input").val()) || 10,
            secondary: {
                provider: $modal.find("#lumia-sum-provider-select").val(),
                model: $modal.find("#lumia-sum-model-input").val(),
                endpoint: $modal.find("#lumia-sum-endpoint-input").val(),
                apiKey: $modal.find("#lumia-sum-apikey-input").val(),
                temperature: parseFloat($modal.find("#lumia-sum-temp-input").val()) || 0.7,
                topP: parseFloat($modal.find("#lumia-sum-topp-input").val()) || 1.0,
                maxTokens: maxTokensVal
            }
        };

        saveSettings();
        toastr.success("Summarization settings saved!");
        closeModal();
    });

    $modal.find(".lumia-sum-cancel-btn").click(closeModal);

    $modal.on("click", function (e) {
        if (e.target === this) closeModal();
    });

    $modal.on("keydown", function (e) {
        if (e.key === "Escape") closeModal();
    });

    $modal[0].showModal();
}

/**
 * Refresh the UI to reflect current settings state
 */
export function refreshUIDisplay() {
    const settings = getSettings();
    const statusDiv = document.getElementById("lumia-book-status");
    const packs = Object.values(settings.packs);

    if (packs.length > 0) {
        if (statusDiv) {
            const totalItems = packs.reduce((acc, p) => acc + p.items.length, 0);
            statusDiv.textContent = `Loaded ${packs.length} packs (${totalItems} items total)`;
        }

        // Update Definition Selector Label
        const currentDefDiv = document.getElementById("lumia-current-definition");
        if (currentDefDiv) {
            const sel = settings.selectedDefinition;
            if (sel) {
                const item = getItemFromLibrary(sel.packName, sel.itemName);
                currentDefDiv.textContent = item ? `${item.lumiaDefName} (${sel.packName})` : "Item not found (Maybe pack removed?)";
            } else {
                currentDefDiv.textContent = "No definition selected";
            }
        }

        // Update Behaviors List
        const currentBehaviorsDiv = document.getElementById("lumia-current-behaviors");
        if (currentBehaviorsDiv) {
            const names = settings.selectedBehaviors.map(sel => {
                const item = getItemFromLibrary(sel.packName, sel.itemName);
                return item ? item.lumiaDefName : null;
            }).filter(n => n);

            currentBehaviorsDiv.textContent = names.length > 0 ? names.join(", ") : "No behaviors selected";
        }

        // Update Personalities List
        const currentPersonalitiesDiv = document.getElementById("lumia-current-personalities");
        if (currentPersonalitiesDiv) {
            const names = settings.selectedPersonalities.map(sel => {
                const item = getItemFromLibrary(sel.packName, sel.itemName);
                return item ? item.lumiaDefName : null;
            }).filter(n => n);

            currentPersonalitiesDiv.textContent = names.length > 0 ? names.join(", ") : "No personalities selected";
        }

        // Update Loom Style
        const currentLoomStyleDiv = document.getElementById("loom-current-style");
        if (currentLoomStyleDiv) {
            const sel = settings.selectedLoomStyle;
            if (sel) {
                const item = getItemFromLibrary(sel.packName, sel.itemName);
                currentLoomStyleDiv.textContent = item ? `${item.loomName} (${sel.packName})` : "Item not found (Maybe pack removed?)";
            } else {
                currentLoomStyleDiv.textContent = "No style selected";
            }
        }

        // Update Loom Utilities List
        const currentLoomUtilsDiv = document.getElementById("loom-current-utils");
        if (currentLoomUtilsDiv) {
            const names = settings.selectedLoomUtils.map(sel => {
                const item = getItemFromLibrary(sel.packName, sel.itemName);
                return item ? item.loomName : null;
            }).filter(n => n);

            currentLoomUtilsDiv.textContent = names.length > 0 ? names.join(", ") : "No utilities selected";
        }

        // Update Loom Retrofits List
        const currentLoomRetrofitsDiv = document.getElementById("loom-current-retrofits");
        if (currentLoomRetrofitsDiv) {
            const names = settings.selectedLoomRetrofits.map(sel => {
                const item = getItemFromLibrary(sel.packName, sel.itemName);
                return item ? item.loomName : null;
            }).filter(n => n);

            currentLoomRetrofitsDiv.textContent = names.length > 0 ? names.join(", ") : "No retrofits selected";
        }

    } else {
        if (statusDiv) statusDiv.textContent = "No Packs loaded";

        ["lumia-current-definition", "lumia-current-behaviors", "lumia-current-personalities",
         "loom-current-style", "loom-current-utils", "loom-current-retrofits"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = "No selection possible (Load packs first)";
        });
    }
}
