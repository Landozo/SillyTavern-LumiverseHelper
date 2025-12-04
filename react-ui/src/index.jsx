/* global SillyTavern */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { LumiverseProvider, useLumiverseStore } from './store/LumiverseContext';
import App from './App';
import ViewportApp from './components/ViewportApp';
import './styles/main.css';

// Store references to mounted React roots for cleanup
const mountedRoots = new Map();

// Store initial settings passed from the extension
let initialExtensionSettings = null;

/**
 * Mount the main Lumiverse settings panel into the extensions settings area
 * @param {string} containerId - The ID of the container element
 * @param {Object} settings - Initial settings from the extension
 * @returns {Function} Cleanup function to unmount
 */
function mountSettingsPanel(containerId = 'lumiverse-settings-root', settings = null) {
    // Store initial settings for the provider
    if (settings) {
        initialExtensionSettings = settings;
        // Sync to store immediately
        useLumiverseStore.syncFromExtension(settings);
    }

    const existingRoot = document.getElementById(containerId);
    if (existingRoot) {
        console.warn('[LumiverseUI] Settings panel already mounted');
        return () => unmount(containerId);
    }

    const container = document.getElementById('extensions_settings');
    if (!container) {
        console.error('[LumiverseUI] Could not find #extensions_settings container');
        return null;
    }

    const rootElement = document.createElement('div');
    rootElement.id = containerId;
    container.appendChild(rootElement);

    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <LumiverseProvider initialSettings={initialExtensionSettings}>
                <App />
            </LumiverseProvider>
        </React.StrictMode>
    );

    mountedRoots.set(containerId, { root, element: rootElement });
    console.log('[LumiverseUI] Settings panel mounted');

    return () => unmount(containerId);
}

/**
 * Mount a React component into a specific container
 * @param {React.Component} Component - The component to mount
 * @param {HTMLElement} container - The DOM container
 * @param {Object} props - Props to pass to the component
 * @param {string} id - Unique identifier for this mount
 * @returns {Function} Cleanup function
 */
function mountComponent(Component, container, props = {}, id = null) {
    const mountId = id || `lumiverse-mount-${Date.now()}`;

    if (mountedRoots.has(mountId)) {
        console.warn(`[LumiverseUI] Component ${mountId} already mounted`);
        return () => unmount(mountId);
    }

    const rootElement = document.createElement('div');
    rootElement.id = mountId;
    rootElement.className = 'lumiverse-react-root';
    container.appendChild(rootElement);

    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <LumiverseProvider>
                <Component {...props} />
            </LumiverseProvider>
        </React.StrictMode>
    );

    mountedRoots.set(mountId, { root, element: rootElement });
    return () => unmount(mountId);
}

/**
 * Unmount a previously mounted React component
 * @param {string} mountId - The ID used when mounting
 */
function unmount(mountId) {
    const mounted = mountedRoots.get(mountId);
    if (mounted) {
        mounted.root.unmount();
        mounted.element.remove();
        mountedRoots.delete(mountId);
        console.log(`[LumiverseUI] Unmounted ${mountId}`);
    }
}

/**
 * Unmount all React components
 */
function unmountAll() {
    for (const [mountId] of mountedRoots) {
        unmount(mountId);
    }
}

/**
 * Get the SillyTavern context (for use in components)
 */
function getSTContext() {
    if (typeof SillyTavern !== 'undefined') {
        return SillyTavern.getContext();
    }
    console.warn('[LumiverseUI] SillyTavern context not available');
    return null;
}

/**
 * Sync settings from the extension to the React store
 * Called when settings change on the extension side
 * @param {Object} settings - Settings in React format
 */
function syncSettings(settings) {
    if (settings) {
        console.log('[LumiverseUI] syncSettings called with:', {
            packsCount: settings.packs?.length || 0,
            customPacksCount: settings.customPacks?.length || 0,
            firstPackItems: settings.packs?.[0]?.items?.length || 0,
        });
        useLumiverseStore.syncFromExtension(settings);
        // Verify the sync worked
        const newState = useLumiverseStore.getState();
        console.log('[LumiverseUI] After sync, store has:', {
            packsCount: newState.packs?.length || 0,
            customPacksCount: newState.customPacks?.length || 0,
            firstPackItems: newState.packs?.[0]?.items?.length || 0,
        });
    } else {
        console.warn('[LumiverseUI] syncSettings called with null/undefined settings');
    }
}

/**
 * Get current state from the React store
 * For the extension to read current UI state
 * @returns {Object} Current state
 */
function getState() {
    return useLumiverseStore.exportForExtension();
}

/**
 * Subscribe to store changes
 * @param {Function} callback - Called when state changes
 * @returns {Function} Unsubscribe function
 */
function subscribe(callback) {
    return useLumiverseStore.subscribe(callback);
}

/**
 * Get the raw Zustand store (for advanced use)
 * @returns {Object} Zustand store
 */
function getStore() {
    return useLumiverseStore;
}

/**
 * Mount the viewport panel (dockable sidebar with profile, browser, analytics)
 * Following the BunnyMo/Loom Summary button pattern for reliable fixed positioning
 * @param {Object} settings - Initial settings from the extension
 * @returns {Function} Cleanup function to unmount
 */
function mountViewportPanel(settings = null) {
    const mountId = 'lumiverse-viewport-root';

    // Remove existing if any (following summary button pattern)
    const existing = document.getElementById(mountId);
    if (existing) {
        existing.remove();
        mountedRoots.delete(mountId);
    }

    // Store initial settings for the provider
    if (settings) {
        useLumiverseStore.syncFromExtension(settings);
    }

    // Create container at body level for proper fixed positioning
    // Apply critical positioning styles inline to ensure they take effect (BunnyMo pattern)
    const rootElement = document.createElement('div');
    rootElement.id = mountId;
    rootElement.className = 'lumiverse-react-root lumiverse-viewport-container';

    // Inline styles for reliable fixed positioning - container is just a wrapper
    // The actual panel positioning is handled by the React component
    rootElement.style.position = 'fixed';
    rootElement.style.top = '0';
    rootElement.style.right = '0';
    rootElement.style.bottom = '0';
    rootElement.style.left = 'auto';
    rootElement.style.zIndex = '9998';
    rootElement.style.pointerEvents = 'none'; // Let clicks pass through to elements below

    // Append directly to document.body for proper fixed positioning
    document.body.appendChild(rootElement);

    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <LumiverseProvider initialSettings={settings}>
                <ViewportApp />
            </LumiverseProvider>
        </React.StrictMode>
    );

    mountedRoots.set(mountId, { root, element: rootElement });
    console.log('[LumiverseUI] Viewport panel mounted with inline positioning');

    return () => unmount(mountId);
}

// Export the public API
const LumiverseUI = {
    // Mounting
    mountSettingsPanel,
    mountViewportPanel,
    mountComponent,
    unmount,
    unmountAll,

    // State sync
    syncSettings,
    getState,
    subscribe,
    getStore,

    // SillyTavern integration
    getSTContext,
};

// Log when the bundle loads
console.log('[LumiverseUI] Bundle loaded, API available:', Object.keys(LumiverseUI));

// Explicitly assign to window for reliable global access
// (webpack library config should do this, but being explicit ensures it works)
if (typeof window !== 'undefined') {
    window.LumiverseUI = LumiverseUI;
}

export default LumiverseUI;
