/**
 * File upload and drag-drop handling.
 */

import { IGNORE_FOLDERS, IGNORE_EXTS } from './config.js';
import { createNode, sortTree } from './tree.js';
import { setRootStructure, setFileRegistry, setUploadBaseline, uploadBaseline } from './state.js';
import { renderTree, setStatus } from './ui.js';
import { elements } from './constants.js';
import { createFileFingerprint } from './file-handler.js';

/**
 * Process files from input element.
 * @param {FileList} fileList - List of files to process
 * @param {Object} options - Upload options
 */
export async function processInputFiles(fileList, options = {}) {
    const rootStructure = [];
    const fileRegistry = {};
    const fingerprints = {};

    for (let file of fileList) {
        const parts = file.webkitRelativePath.split('/');
        if (!parts.length || shouldIgnorePath(file.webkitRelativePath)) {
            continue;
        }

        const [rootName, ...relativeParts] = parts;
        const relativePath = relativeParts.join('/');
        if (!relativePath) {
            continue;
        }

        if (shouldIgnoreFile(relativeParts[relativeParts.length - 1])) {
            continue;
        }

        let rootNode = rootStructure.find(node => {
            return node.name === rootName && node.type === 'folder';
        });

        if (!rootNode) {
            rootNode = createNode(rootName, 'folder', null, '');
            rootNode.collapsed = false;
            rootStructure.push(rootNode);
        }

        fingerprints[relativePath] = await createFileFingerprint(file);
        addFileToTreeStructure(rootNode.children, fileRegistry, relativeParts, file, relativePath);
    }

    finalizeUpload(rootStructure, fileRegistry, fingerprints, options);
}

/**
 * Process directory entry from drag-drop.
 * @param {FileSystemDirectoryEntry} entry - Directory entry
 * @param {Object} options - Upload options
 */
export async function processEntry(entry, options = {}) {
    const rootStructure = [];
    const fileRegistry = {};
    const fingerprints = {};

    const root = createNode(entry.name, 'folder', null, '');
    root.collapsed = false;
    rootStructure.push(root);

    await scanRecursively(entry, root, fileRegistry, fingerprints, '');
    finalizeUpload(rootStructure, fileRegistry, fingerprints, options);
}

/**
 * Recursively scan directory entry.
 * @param {FileSystemEntry} entry - Directory entry
 * @param {Object} parent - Parent tree node
 * @param {Object} fileRegistry - File registry
 * @param {Object} fingerprints - File fingerprints by root-relative path
 * @param {string} relativePath - Current root-relative path
 */
async function scanRecursively(entry, parent, fileRegistry, fingerprints, relativePath) {
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
            const childRelativePath = joinRelativePath(relativePath, child.name);
            const folder = createNode(child.name, 'folder', null, childRelativePath);
            parent.children.push(folder);
            await scanRecursively(child, folder, fileRegistry, fingerprints, childRelativePath);
        } else {
            if (shouldIgnoreFile(child.name)) {
                continue;
            }

            const file = await entryFile(child);
            const childRelativePath = joinRelativePath(relativePath, child.name);
            const id = Math.random().toString(36).substr(2, 9);
            fileRegistry[id] = file;
            fingerprints[childRelativePath] = await createFileFingerprint(file);
            parent.children.push(createNode(child.name, 'file', id, childRelativePath));
        }
    }
}

/**
 * Add file to tree structure recursively.
 * @param {Array} level - Current tree level
 * @param {Object} fileRegistry - File registry
 * @param {Array} parts - Path parts inside the uploaded root folder
 * @param {File} fileObj - File object
 * @param {string} relativePath - Root-relative file path
 * @param {string} currentPath - Current folder path
 */
function addFileToTreeStructure(level, fileRegistry, parts, fileObj, relativePath, currentPath = '') {
    const name = parts[0];
    if (IGNORE_FOLDERS.includes(name)) {
        return;
    }

    let node = level.find(x => x.name === name);
    const isFile = parts.length === 1;
    const nodeRelativePath = isFile ? relativePath : joinRelativePath(currentPath, name);

    if (!node) {
        const id = isFile ? Math.random().toString(36).substr(2, 9) : null;
        node = createNode(name, isFile ? 'file' : 'folder', id, nodeRelativePath);

        if (isFile) {
            if (shouldIgnoreFile(name)) {
                return;
            }
            fileRegistry[id] = fileObj;
        }

        level.push(node);
    }

    if (!isFile) {
        addFileToTreeStructure(node.children, fileRegistry, parts.slice(1), fileObj, relativePath, nodeRelativePath);
    }
}

/**
 * Finalize upload and show results.
 * @param {Array} rootStructure - Root tree nodes
 * @param {Object} fileRegistry - File registry
 * @param {Object} fingerprints - File fingerprints by root-relative path
 * @param {Object} options - Upload options
 */
function finalizeUpload(rootStructure, fileRegistry, fingerprints, options = {}) {
    sortTree(rootStructure);
    const diffSummary = options.diff && uploadBaseline
        ? applyDiffSelection(rootStructure, fingerprints, uploadBaseline.fingerprints)
        : null;

    setRootStructure(rootStructure);
    setFileRegistryWrapper(fileRegistry);
    setUploadBaseline({
        fingerprints: fingerprints
    });

    elements.uploadOverlay.classList.add('hidden');
    elements.sidebar.style.display = 'flex';
    elements.resultView.style.display = 'flex';
    elements.diffBtn.style.display = 'inline-flex';

    setTimeout(() => {
        elements.resultView.classList.add('visible');
    }, 50);

    elements.resetBtn.style.display = 'inline-flex';
    renderTree(rootStructure);
    if (diffSummary) {
        if (diffSummary.changed === 0) {
            setStatus('No file changes detected.');
        } else {
            setStatus(`Diff ready: ${diffSummary.changed} changed/new, ${diffSummary.unchanged} unchanged skipped.`);
        }
    } else {
        setStatus('Ready.');
    }
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
 * Join root-relative path segments.
 * @param {string} base - Current path
 * @param {string} name - Next segment
 * @returns {string} Combined path
 */
function joinRelativePath(base, name) {
    return base ? `${base}/${name}` : name;
}

/**
 * Apply diff selection against a previous upload snapshot.
 * Changed and new files remain checked; unchanged files are unchecked.
 * @param {Array} rootNodes - Tree nodes
 * @param {Object} currentFingerprints - Current fingerprint map
 * @param {Object} previousFingerprints - Previous fingerprint map
 * @returns {Object} Diff summary
 */
function applyDiffSelection(rootNodes, currentFingerprints, previousFingerprints) {
    const summary = {
        changed: 0,
        unchanged: 0
    };

    rootNodes.forEach(rootNode => {
        applyDiffToNode(rootNode, currentFingerprints, previousFingerprints, summary, true);
    });

    return summary;
}

/**
 * Apply diff state recursively to a tree node.
 * @param {Object} node - Tree node
 * @param {Object} currentFingerprints - Current fingerprint map
 * @param {Object} previousFingerprints - Previous fingerprint map
 * @param {Object} summary - Diff summary accumulator
 * @param {boolean} isRoot - Whether this node is a root node
 * @returns {boolean} True if the node or a descendant is selected
 */
function applyDiffToNode(node, currentFingerprints, previousFingerprints, summary, isRoot = false) {
    if (node.type === 'file') {
        const previous = previousFingerprints[node.relativePath];
        const changed = !previous || previous !== currentFingerprints[node.relativePath];

        node.checked = changed;
        if (changed) {
            summary.changed++;
        } else {
            summary.unchanged++;
        }

        return changed;
    }

    let hasCheckedChild = false;
    node.children.forEach(child => {
        hasCheckedChild = applyDiffToNode(child, currentFingerprints, previousFingerprints, summary) || hasCheckedChild;
    });

    node.checked = hasCheckedChild;
    node.collapsed = isRoot ? false : !hasCheckedChild;
    return hasCheckedChild;
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
