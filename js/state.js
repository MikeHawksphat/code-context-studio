/**
 * Global application state.
 */

export let rootStructure = [];
export let fileRegistry = {};

/**
 * Reset application state.
 */
export function resetState() {
    rootStructure = [];
    fileRegistry = {};
}

/**
 * Update root structure.
 * @param {Array} newStructure - The new file tree structure
 */
export function setRootStructure(newStructure) {
    rootStructure = newStructure;
}

/**
 * Update file registry.
 * @param {Object} newRegistry - The new file registry
 */
export function setFileRegistry(newRegistry) {
    fileRegistry = newRegistry;
}

/**
 * Add file to registry.
 * @param {string} id - File ID
 * @param {File} file - File object
 */
export function addFileToRegistry(id, file) {
    fileRegistry[id] = file;
}

/**
 * Get file from registry.
 * @param {string} id - File ID
 * @returns {File|null} File object or null
 */
export function getFile(id) {
    return fileRegistry[id] || null;
}
