/**
 * Global application state.
 */

export let rootStructure = [];
export let fileRegistry = {};
export let uploadBaseline = null;
export let currentDiff = null;
export let treeFilter = 'all';
export let pendingUploadMode = 'normal';

/**
 * Reset application state.
 */
export function resetState() {
    rootStructure = [];
    fileRegistry = {};
    uploadBaseline = null;
    currentDiff = null;
    treeFilter = 'all';
    pendingUploadMode = 'normal';
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
 * Update the current diff state.
 * @param {Object|null} diff - Current diff metadata
 */
export function setCurrentDiff(diff) {
    currentDiff = diff;
}

/**
 * Update the current tree filter.
 * @param {string} filter - Filter id
 */
export function setTreeFilter(filter) {
    treeFilter = filter;
}

/**
 * Update pending upload mode.
 * @param {string} mode - Upload mode
 */
export function setPendingUploadMode(mode) {
    pendingUploadMode = mode;
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
