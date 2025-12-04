# Lumiverse Helper - React UI

This directory contains the React-based UI components for Lumiverse Helper.

## Setup

```bash
cd react-ui
npm install
```

## Development

Build once:
```bash
npm run build:dev
```

Watch mode (rebuilds on changes):
```bash
npm run dev
```

Production build (minified):
```bash
npm run build
```

## Output

The build outputs to `../dist/ui.bundle.js`, which can be loaded by the main extension.

## Integration with Main Extension

The bundle exposes a `LumiverseUI` object on `window` with the following API:

```javascript
// Mount the settings panel
const cleanup = LumiverseUI.mountSettingsPanel();

// Mount a specific component
const cleanup = LumiverseUI.mountComponent(Component, container, props, id);

// Unmount
LumiverseUI.unmount(mountId);
LumiverseUI.unmountAll();

// Access SillyTavern context
const ctx = LumiverseUI.getSTContext();
```

## NPM Libraries Used

- **react** / **react-dom**: UI framework
- **zustand**: Lightweight state management (3KB)
- **immer**: Immutable state updates made easy
- **clsx**: Conditional className utility

## Adding New Libraries

Since we use webpack bundling, you can `npm install` any library:

```bash
npm install lodash-es  # Tree-shakeable lodash
npm install date-fns   # Date utilities
npm install dompurify  # HTML sanitization
```

Then import and use:

```javascript
import { debounce } from 'lodash-es';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
```
