/**
 * Global application state.
 */

export let rootStructure = [];
export let fileRegistry = {};
export let uploadBaseline = null;

/**
 * Reset application state.
 */
export function resetState() {
    rootStructure = [];
    fileRegistry = {};
    uploadBaseline = null;
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
 * Update upload baseline snapshot.
 * @param {Object|null} newBaseline - Baseline snapshot
 */
export function setUploadBaseline(newBaseline) {
    uploadBaseline = newBaseline;
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
