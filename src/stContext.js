/**
 * SillyTavern Context Accessor
 *
 * Provides safe access to ST APIs via the global SillyTavern object.
 * This centralizes all ST API access, replacing fragile relative imports.
 *
 * IMPORTANT: All ST API access must go through this module.
 * Do NOT use relative imports to ST internals (e.g., ../../../extensions.js)
 */

// Cache the context after first retrieval
let _cachedContext = null;

/**
 * Get the SillyTavern context object.
 * This provides access to chat, characters, and various utilities.
 * @returns {Object|null} ST context with all APIs, or null if not available
 */
export function getContext() {
  if (_cachedContext) {
    return _cachedContext;
  }

  if (typeof SillyTavern !== "undefined" && SillyTavern.getContext) {
    _cachedContext = SillyTavern.getContext();
    return _cachedContext;
  }

  console.error("[LumiverseHelper] SillyTavern global not available");
  return null;
}

/**
 * Get the extension_settings object for storing extension data.
 * This is where persistent settings are stored.
 * @returns {Object} Extension settings object
 */
export function getExtensionSettings() {
  const ctx = getContext();
  return ctx?.extensionSettings || {};
}

/**
 * Get the saveSettingsDebounced function for persisting settings.
 * @returns {Function} Debounced save function
 */
export function getSaveSettingsDebounced() {
  const ctx = getContext();
  return ctx?.saveSettingsDebounced || (() => {});
}

/**
 * Get the eventSource for subscribing to ST events.
 * @returns {Object|null} EventEmitter-like object
 */
export function getEventSource() {
  const ctx = getContext();
  return ctx?.eventSource || null;
}

/**
 * Get the event_types enum for event names.
 * @returns {Object} Event types enum
 */
export function getEventTypes() {
  const ctx = getContext();
  return ctx?.eventTypes || {};
}

/**
 * Get the MacrosParser for registering custom macros.
 * @returns {Object|null} MacrosParser instance
 */
export function getMacrosParser() {
  const ctx = getContext();
  return ctx?.MacrosParser || null;
}

/**
 * Get the SlashCommandParser for registering slash commands.
 * @returns {Object|null} SlashCommandParser instance
 */
export function getSlashCommandParser() {
  const ctx = getContext();
  return ctx?.SlashCommandParser || null;
}

/**
 * Get the SlashCommand class for creating commands.
 * @returns {Function|null} SlashCommand constructor
 */
export function getSlashCommand() {
  const ctx = getContext();
  return ctx?.SlashCommand || null;
}

/**
 * Get request headers for API calls.
 * @returns {Object} Headers object for fetch requests
 */
export function getRequestHeaders() {
  const ctx = getContext();
  if (ctx?.getRequestHeaders) {
    return ctx.getRequestHeaders();
  }
  return {};
}

/**
 * Get the generateRaw function for direct LLM calls.
 * @returns {Function|null} generateRaw function
 */
export function getGenerateRaw() {
  const ctx = getContext();
  return ctx?.generateRaw || null;
}

/**
 * Get the generateQuietPrompt function for background LLM calls.
 * @returns {Function|null} generateQuietPrompt function
 */
export function getGenerateQuietPrompt() {
  const ctx = getContext();
  return ctx?.generateQuietPrompt || null;
}

/**
 * Get chat metadata for storing per-chat data.
 * @returns {Object} Chat metadata object
 */
export function getChatMetadata() {
  const ctx = getContext();
  return ctx?.chatMetadata || {};
}

/**
 * Get the current character data.
 * @returns {Object|null} Character object
 */
export function getCurrentCharacter() {
  const ctx = getContext();
  return ctx?.characters?.[ctx?.characterId] || null;
}

/**
 * Get the current chat array.
 * @returns {Array} Array of chat messages
 */
export function getChat() {
  const ctx = getContext();
  return ctx?.chat || [];
}

/**
 * Clear the cached context (useful for testing or when context changes).
 */
export function clearContextCache() {
  _cachedContext = null;
}
