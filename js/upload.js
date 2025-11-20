/**
 * File upload and drag-drop handling.
 */

import { IGNORE_FOLDERS, IGNORE_EXTS } from './config.js';
import { createNode, sortTree } from './tree.js';
import { setRootStructure, setFileRegistry } from './state.js';
import { renderTree, setStatus } from './ui.js';
import { elements } from './constants.js';

/**
 * Process files from input element.
 * @param {FileList} fileList - List of files to process
 */
export async function processInputFiles(fileList) {
    const rootStructure = [];
    const fileRegistry = {};

    for (let file of fileList) {
        const parts = file.webkitRelativePath.split('/');
        if (!parts.length || shouldIgnorePath(file.webkitRelativePath)) {
            continue;
        }
        addFileToTreeStructure(rootStructure, fileRegistry, parts, file);
    }

    finalizeUpload(rootStructure, fileRegistry);
}

/**
 * Process directory entry from drag-drop.
 * @param {FileSystemDirectoryEntry} entry - Directory entry
 */
export async function processEntry(entry) {
    const rootStructure = [];
    const fileRegistry = {};

    const root = createNode(entry.name, 'folder');
    root.collapsed = false;
    rootStructure.push(root);

    await scanRecursively(entry, root, fileRegistry);
    finalizeUpload(rootStructure, fileRegistry);
}

/**
 * Recursively scan directory entry.
 * @param {FileSystemEntry} entry - Directory entry
 * @param {Object} parent - Parent tree node
 * @param {Object} fileRegistry - File registry
 */
async function scanRecursively(entry, parent, fileRegistry) {
    if (!entry.isDirectory) {
        return;
    }

    const reader = entry.createReader();
    const entries = await readEntriesAll(reader);

    for (const child of entries) {
        if (IGNORE_FOLDERS.includes(child.name)) {
            continue;
        }

        if (child.isDirectory) {
            const folder = createNode(child.name, 'folder');
            parent.children.push(folder);
            await scanRecursively(child, folder, fileRegistry);
        } else {
            if (shouldIgnoreFile(child.name)) {
                continue;
            }

            const file = await entryFile(child);
            const id = Math.random().toString(36).substr(2, 9);
            fileRegistry[id] = file;
            parent.children.push(createNode(child.name, 'file', id));
        }
    }
}

/**
 * Add file to tree structure recursively.
 * @param {Array} level - Current tree level
 * @param {Object} fileRegistry - File registry
 * @param {Array} parts - Path parts
 * @param {File} fileObj - File object
 */
function addFileToTreeStructure(level, fileRegistry, parts, fileObj) {
    const name = parts[0];
    if (IGNORE_FOLDERS.includes(name)) {
        return;
    }

    let node = level.find(x => x.name === name);
    const isFile = parts.length === 1;

    if (!node) {
        const id = isFile ? Math.random().toString(36).substr(2, 9) : null;
        node = createNode(name, isFile ? 'file' : 'folder', id);

        if (isFile) {
            if (shouldIgnoreFile(name)) {
                return;
            }
            fileRegistry[id] = fileObj;
        }

        level.push(node);
    }

    if (!isFile) {
        addFileToTreeStructure(node.children, fileRegistry, parts.slice(1), fileObj);
    }
}

/**
 * Finalize upload and show results.
 * @param {Array} rootStructure - Root tree nodes
 * @param {Object} fileRegistry - File registry
 */
function finalizeUpload(rootStructure, fileRegistry) {
    sortTree(rootStructure);
    setRootStructure(rootStructure);
    setFileRegistryWrapper(fileRegistry);

    elements.uploadOverlay.classList.add('hidden');
    elements.sidebar.style.display = 'flex';
    elements.resultView.style.display = 'flex';

    setTimeout(() => {
        elements.resultView.classList.add('visible');
    }, 50);

    elements.resetBtn.style.display = 'inline-flex';
    renderTree(rootStructure);
    setStatus('Ready.');
}

/**
 * Set file registry.
 * @param {Object} fileRegistry - File registry
 */
function setFileRegistryWrapper(fileRegistry) {
    setFileRegistry(fileRegistry);
}

/**
 * Check if file path should be ignored.
 * @param {string} path - File path
 * @returns {boolean} True if should ignore
 */
function shouldIgnorePath(path) {
    return IGNORE_FOLDERS.some(f => {
        return path.includes(`/${f}/`) || path.startsWith(`${f}/`);
    });
}

/**
 * Check if file should be ignored.
 * @param {string} name - File name
 * @returns {boolean} True if should ignore
 */
function shouldIgnoreFile(name) {
    return name.startsWith('.') || IGNORE_EXTS.some(e => {
        return name.toLowerCase().endsWith(e);
    });
}

/**
 * Read all entries from a DirectoryReader.
 * @param {DirectoryReader} reader - Directory reader
 * @returns {Promise<Array>} All entries
 */
function readEntriesAll(reader) {
    return new Promise(res => {
        let all = [];
        let read = () => {
            reader.readEntries(r => {
                if (!r.length) {
                    res(all);
                } else {
                    all = all.concat(r);
                    read();
                }
            });
        };
        read();
    });
}

/**
 * Get File object from FileSystemFileEntry.
 * @param {FileSystemFileEntry} entry - File entry
 * @returns {Promise<File>} File object
 */
function entryFile(entry) {
    return new Promise((res, rej) => {
        entry.file(res, rej);
    });
}
