/**
 * UI Constants: Icons and DOM element references.
 */

/**
 * SVG Icons used throughout the application.
 */
export const ICONS = {
    FOLDER: `<svg class="tree-icon" viewBox="0 0 24 24" fill="#dcb67a"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    FILE: `<svg class="tree-icon" viewBox="0 0 24 24" fill="none" stroke="#519aba" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`,
    CHEVRON: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`
};

/**
 * Cached DOM element references.
 */
export const elements = {
    dropZone: document.getElementById('dropZone'),
    uploadOverlay: document.getElementById('uploadOverlay'),
    resultView: document.getElementById('resultView'),
    sidebar: document.getElementById('sidebar'),
    fileTree: document.getElementById('fileTree'),
    preview: document.getElementById('preview'),
    statusBar: document.getElementById('statusBar'),
    resetBtn: document.getElementById('resetBtn'),
    resizer: document.getElementById('resizer'),
    folderInput: document.getElementById('folderInput'),
    generateBtn: document.getElementById('generateBtn'),
    copyBtn: document.getElementById('copyBtn'),
    optTree: document.getElementById('optTree'),
    optEmpty: document.getElementById('optEmpty')
};
