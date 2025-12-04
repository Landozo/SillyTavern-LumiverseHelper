/**
 * React Bridge Module
 * Handles integration between the React UI and the existing extension system.
 *
 * This module:
 * 1. Loads and initializes the React UI bundle
 * 2. Syncs state between React and the extension settings
 * 3. Exposes callbacks for React components to trigger extension actions
 */

import { getSettings, saveSettings, SETTINGS_KEY, MODULE_NAME } from "./settingsManager.js";
import { extension_settings } from "../../../../extensions.js";
import { eventSource, event_types } from "../../../../../script.js";

// Path to the React bundle - we need to determine this dynamically
// since the folder name might differ from MODULE_NAME
function getReactBundlePath() {
    // Try to find our script tag to determine the base path
    const scripts = document.querySelectorAll('script[src*="lumia"], script[src*="lumiverse"]');
    for (const script of scripts) {
        const src = script.src;
        // Extract the extension folder path
        const match = src.match(/(\/scripts\/extensions\/third-party\/[^/]+)\//);
        if (match) {
            return `${match[1]}/dist/ui.bundle.js`;
        }
    }
    // Fallback - try common names
    return `/scripts/extensions/third-party/SillyTavern-LumiverseHelper/dist/ui.bundle.js`;
}

// Track if React UI is loaded
let reactUILoaded = false;
let cleanupFn = null;
let viewportCleanupFn = null;

// Callbacks that React components can trigger
const extensionCallbacks = {
    // Pack management
    onPacksChanged: null,
    onSelectionChanged: null,

    // Modal triggers (for hybrid mode during migration)
    showSelectionModal: null,
    showLoomSelectionModal: null,
    showMiscFeaturesModal: null,
    showSummarizationModal: null,
    showPromptSettingsModal: null,
    showLumiaEditorModal: null,
    showLucidCardsModal: null,

    // Data operations
    fetchWorldBook: null,
    handleNewBook: null,

    // UI refresh
    refreshUIDisplay: null,
};

/**
 * Register a callback from the main extension
 * @param {string} name - Callback name
 * @param {Function} fn - Callback function
 */
export function registerCallback(name, fn) {
    if (name in extensionCallbacks) {
        extensionCallbacks[name] = fn;
    } else {
        console.warn(`[ReactBridge] Unknown callback: ${name}`);
    }
}

/**
 * Get all registered callbacks (for React components to use)
 * @returns {Object} Callbacks object
 */
export function getCallbacks() {
    return { ...extensionCallbacks };
}

/**
 * Convert extension settings to React store format
 *
 * IMPORTANT: This is now a simple passthrough. We do NOT transform the data.
 * The old code stores settings.packs as an OBJECT keyed by pack name.
 * React components must handle this format directly to maintain compatibility.
 *
 * @returns {Object} Settings in the EXACT format from getSettings()
 */
export function settingsToReactFormat() {
    const settings = getSettings();

    console.log('[ReactBridge] settingsToReactFormat - passing through exact settings:', {
        packsType: typeof settings.packs,
        packsKeys: settings.packs ? Object.keys(settings.packs) : [],
        selectedDefinition: settings.selectedDefinition,
        selectedBehaviorsCount: settings.selectedBehaviors?.length || 0,
    });

    // Return the EXACT settings structure - no transformation
    // This matches what the old uiModals.js expects
    return settings;
}

/**
 * Apply React state changes back to extension settings
 *
 * IMPORTANT: React should be sending data in the EXACT same format as getSettings().
 * We simply merge the incoming state with the current settings.
 *
 * @param {Object} reactState - State from React store (same format as getSettings())
 */
export function reactFormatToSettings(reactState) {
    const settings = getSettings();

    console.log('[ReactBridge] reactFormatToSettings - applying state:', {
        packsType: typeof reactState.packs,
        packsKeys: reactState.packs ? Object.keys(reactState.packs) : [],
    });

    // Merge all properties from reactState into settings
    // This preserves the exact structure without transformation
    Object.assign(settings, reactState);

    saveSettings();
}

/**
 * Notify React UI of settings changes from the extension side
 */
export function notifyReactOfSettingsChange() {
    console.log('[ReactBridge] notifyReactOfSettingsChange called');
    console.log('[ReactBridge] window.LumiverseUI available:', !!window.LumiverseUI);
    console.log('[ReactBridge] syncSettings function:', typeof window.LumiverseUI?.syncSettings);

    if (window.LumiverseUI && window.LumiverseUI.syncSettings) {
        const reactSettings = settingsToReactFormat();
        console.log('[ReactBridge] Sending to React:', {
            packsCount: reactSettings.packs?.length || 0,
            customPacksCount: reactSettings.customPacks?.length || 0,
            firstPackName: reactSettings.packs?.[0]?.name || 'none',
            firstPackItemCount: reactSettings.packs?.[0]?.items?.length || 0,
        });
        window.LumiverseUI.syncSettings(reactSettings);
    } else {
        console.warn('[ReactBridge] LumiverseUI.syncSettings not available');
    }
}

/**
 * Set up event listeners for syncing
 */
function setupEventSync() {
    // When chat changes, notify React
    eventSource.on(event_types.CHAT_CHANGED, () => {
        notifyReactOfSettingsChange();
    });
}

/**
 * Initialize the React UI
 * @param {HTMLElement} container - Container element to mount into
 * @returns {Promise<boolean>} Success status
 */
/**
 * Load the React bundle script dynamically
 * @returns {Promise<void>}
 */
async function loadReactBundle() {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.LumiverseUI) {
            console.log("[ReactBridge] LumiverseUI already available");
            resolve();
            return;
        }

        const bundlePath = getReactBundlePath();

        // Check if script tag already exists
        const existingScript = document.querySelector(`script[src*="ui.bundle.js"]`);
        if (existingScript) {
            console.log("[ReactBridge] Script tag exists, waiting for load...");
            // Wait for it to load
            const checkLoaded = setInterval(() => {
                if (window.LumiverseUI) {
                    clearInterval(checkLoaded);
                    resolve();
                }
            }, 50);
            setTimeout(() => {
                clearInterval(checkLoaded);
                reject(new Error("Timeout waiting for existing script"));
            }, 5000);
            return;
        }

        console.log("[ReactBridge] Loading React bundle from:", bundlePath);

        const script = document.createElement("script");
        script.src = bundlePath;
        script.async = true;

        script.onload = () => {
            console.log("[ReactBridge] React bundle script loaded");
            // Give it a moment to execute and expose LumiverseUI
            setTimeout(() => {
                if (window.LumiverseUI) {
                    console.log("[ReactBridge] LumiverseUI now available");
                    resolve();
                } else {
                    reject(new Error("LumiverseUI not available after script load"));
                }
            }, 100);
        };

        script.onerror = (error) => {
            console.error("[ReactBridge] Failed to load React bundle:", error);
            reject(new Error("Failed to load React bundle"));
        };

        document.head.appendChild(script);
    });
}

export async function initializeReactUI(container) {
    console.log("[ReactBridge] initializeReactUI called, container:", container);
    console.log("[ReactBridge] window.LumiverseUI exists:", !!window.LumiverseUI);

    if (reactUILoaded) {
        console.warn("[ReactBridge] React UI already initialized");
        return true;
    }

    try {
        // Load the React bundle if not already available
        if (!window.LumiverseUI) {
            console.log("[ReactBridge] Loading React bundle...");
            await loadReactBundle();
        }

        console.log("[ReactBridge] LumiverseUI API:", window.LumiverseUI);
        console.log("[ReactBridge] mountSettingsPanel exists:", typeof window.LumiverseUI.mountSettingsPanel);

        // Provide initial settings to React
        const initialSettings = settingsToReactFormat();
        console.log("[ReactBridge] Initial settings prepared");

        // Expose the bridge API to React
        window.LumiverseBridge = {
            getSettings: settingsToReactFormat,
            saveSettings: reactFormatToSettings,
            getCallbacks,
            notifySettingsChange: notifyReactOfSettingsChange,
        };
        console.log("[ReactBridge] Bridge API exposed on window.LumiverseBridge");

        // Mount the React settings panel
        if (container && window.LumiverseUI.mountSettingsPanel) {
            console.log("[ReactBridge] Calling mountSettingsPanel...");
            cleanupFn = window.LumiverseUI.mountSettingsPanel(
                "lumiverse-react-root",
                initialSettings
            );
            console.log("[ReactBridge] mountSettingsPanel returned:", cleanupFn);
        } else {
            console.error("[ReactBridge] Cannot mount: container=", container, "mountSettingsPanel=", window.LumiverseUI?.mountSettingsPanel);
        }

        // Mount the viewport panel (sidebar with profile, browser, analytics)
        if (window.LumiverseUI.mountViewportPanel) {
            console.log("[ReactBridge] Mounting viewport panel...");
            viewportCleanupFn = window.LumiverseUI.mountViewportPanel(initialSettings);
            console.log("[ReactBridge] Viewport panel mounted");
        }

        // Set up event sync
        setupEventSync();

        reactUILoaded = true;
        console.log("[ReactBridge] React UI initialized successfully");
        return true;

    } catch (error) {
        console.error("[ReactBridge] Failed to initialize React UI:", error);
        return false;
    }
}

/**
 * Cleanup and unmount React UI
 */
export function destroyReactUI() {
    if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
    }

    if (viewportCleanupFn) {
        viewportCleanupFn();
        viewportCleanupFn = null;
    }

    if (window.LumiverseUI && window.LumiverseUI.unmountAll) {
        window.LumiverseUI.unmountAll();
    }

    reactUILoaded = false;
    console.log("[ReactBridge] React UI destroyed");
}

/**
 * Check if React UI is available and loaded
 * @returns {boolean}
 */
export function isReactUIAvailable() {
    return reactUILoaded && !!window.LumiverseUI;
}
