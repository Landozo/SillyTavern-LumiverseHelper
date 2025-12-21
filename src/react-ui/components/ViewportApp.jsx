import React, { useState, useCallback, useSyncExternalStore } from 'react';
import ViewportPanel from './ViewportPanel';
import CharacterProfile from './panels/CharacterProfile';
import PackBrowser from './panels/PackBrowser';
import OOCSettings from './panels/OOCSettings';
import PromptSettings from './panels/PromptSettings';
import SummaryEditor from './panels/SummaryEditor';
import { useLumiverseStore } from '../store/LumiverseContext';

// Get the store for direct access
const store = useLumiverseStore;

/**
 * Main viewport application component
 * Contains the toggle button and panel as one unified sliding unit
 * Respects the showLumiverseDrawer setting from the store
 */
function ViewportApp() {
    const [isPanelVisible, setIsPanelVisible] = useState(false);

    // Check if drawer should be shown at all
    const showDrawer = useSyncExternalStore(
        store.subscribe,
        () => store.getState().showLumiverseDrawer ?? true,
        () => store.getState().showLumiverseDrawer ?? true
    );

    const handleToggle = useCallback(() => {
        setIsPanelVisible(prev => !prev);
    }, []);

    const handleClose = useCallback(() => {
        setIsPanelVisible(false);
    }, []);

    // Don't render anything if drawer is disabled
    if (!showDrawer) {
        return null;
    }

    return (
        <ViewportPanel
            isVisible={isPanelVisible}
            onToggle={handleToggle}
            onClose={handleClose}
            defaultTab="profile"
            ProfileContent={CharacterProfile}
            BrowserContent={PackBrowser}
            OOCContent={OOCSettings}
            PromptContent={PromptSettings}
            SummaryContent={SummaryEditor}
        />
    );
}

export default ViewportApp;
