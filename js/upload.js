/**
 * File upload and drag-drop handling.
 */

import { IGNORE_FOLDERS, IGNORE_EXTS } from './config.js';
import { buildBaseline, getStoredBaseline, saveStoredBaseline, validateBaseline } from './baseline-storage.js';
import { createFileFingerprint } from './file-handler.js';
import { elements } from './constants.js';
import {
    setCurrentDiff,
    setFileRegistry,
    setRootStructure,
    setTreeFilter,
    setUploadBaseline,
    uploadBaseline
} from './state.js';
import { createNode, sortTree } from './tree.js';
import { renderTree, setStatus, updateToolbarState } from './ui.js';

/**
 * Process files from input element.
 * @param {FileList} fileList - List of files to process
 * @param {Object} options - Upload options
 */
export async function processInputFiles(fileList, options = {}) {
    const descriptors = [];
    let rootName = '';

    for (const file of fileList) {
        const parts = file.webkitRelativePath.split('/');
        if (!parts.length || shouldIgnorePath(file.webkitRelativePath)) {
            continue;
        }

        const [candidateRootName, ...relativeParts] = parts;
        const relativePath = relativeParts.join('/');
        if (!relativePath || shouldIgnoreFile(relativeParts[relativeParts.length - 1])) {
            continue;
        }

        if (!rootName) {
            rootName = candidateRootName;
        }

        descriptors.push({ relativePath, file });
    }

    await finalizeUpload(rootName, descriptors, options);
}

/**
 * Process directory entry from drag-drop.
 * @param {FileSystemDirectoryEntry} entry - Directory entry
 * @param {Object} options - Upload options
 */
export async function processEntry(entry, options = {}) {
    const descriptors = [];

    await scanRecursively(entry, '', descriptors);
    await finalizeUpload(entry.name, descriptors, options);
}

/**
 * Recursively collect files from a directory entry.
 * @param {FileSystemDirectoryEntry} entry - Directory entry
 * @param {string} relativePath - Current root-relative path
 * @param {Array} descriptors - Collected file descriptors
 */
async function scanRecursively(entry, relativePath, descriptors) {
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
            await scanRecursively(child, joinRelativePath(relativePath, child.name), descriptors);
            continue;
        }

        if (shouldIgnoreFile(child.name)) {
            continue;
        }

        const file = await entryFile(child);
        descriptors.push({
            relativePath: joinRelativePath(relativePath, child.name),
            file
        });
    }
}

/**
 * Finalize upload and render the explorer.
 * @param {string} rootName - Root folder name
 * @param {Array} descriptors - File descriptors
 * @param {Object} options - Upload options
 */
async function finalizeUpload(rootName, descriptors, options = {}) {
    if (!rootName) {
        setStatus('No supported files found.');
        return;
    }

    setStatus('Fingerprinting files...');

    const fingerprintEntries = await Promise.all(descriptors.map(async descriptor => {
        return [
            descriptor.relativePath,
            await createFileFingerprint(descriptor.file)
        ];
    }));

    const fingerprints = Object.fromEntries(fingerprintEntries);
    const { rootStructure, fileRegistry, rootNode } = buildTree(rootName, descriptors);
    const comparison = resolveComparisonBaseline(rootName, Object.keys(fingerprints).sort(), options);

    let diffResult = null;
    let statusMessage = 'Ready.';

    if (comparison.shouldDiff && comparison.baseline) {
        diffResult = applyDiff(rootNode, rootName, fingerprints, comparison.baseline);
        setCurrentDiff({
            rootName,
            summary: diffResult.summary,
            source: comparison.source,
            warning: comparison.warning || null
        });
        setTreeFilter('changed');
        statusMessage = buildDiffStatusMessage(diffResult.summary, comparison.warning, comparison.source);
    } else {
        setCurrentDiff(null);
        setTreeFilter('all');
        markTreeAsFullUpload(rootNode);

        if (comparison.warning) {
            statusMessage = `Loaded full folder. ${comparison.warning}`;
        }
    }

    sortTree(rootStructure);
    setRootStructure(rootStructure);
    setFileRegistry(fileRegistry);

    const newBaseline = buildBaseline(rootName, fingerprints);
    setUploadBaseline(newBaseline);
    saveStoredBaseline(newBaseline);

    elements.uploadOverlay.classList.add('hidden');
    elements.sidebar.style.display = 'flex';
    elements.resultView.style.display = 'flex';
    elements.diffBtn.style.display = 'inline-flex';

    setTimeout(() => {
        elements.resultView.classList.add('visible');
    }, 50);

    elements.resetBtn.style.display = 'inline-flex';
    updateToolbarState();
    renderTree(rootStructure);
    setStatus(statusMessage);
}

/**
 * Build a tree and file registry from descriptors.
 * @param {string} rootName - Root folder name
 * @param {Array} descriptors - File descriptors
 * @returns {Object} Tree and registry
 */
function buildTree(rootName, descriptors) {
    const rootStructure = [];
    const fileRegistry = {};
    const rootNode = createNode(rootName, 'folder', null, '');
    rootNode.collapsed = false;
    rootStructure.push(rootNode);

    descriptors.forEach(({ relativePath, file }) => {
        addFileToTree(rootNode.children, fileRegistry, relativePath.split('/'), file, relativePath);
    });

    return { rootStructure, fileRegistry, rootNode };
}

/**
 * Add a file into the tree recursively.
 * @param {Array} level - Tree level
 * @param {Object} fileRegistry - File registry
 * @param {string[]} parts - Root-relative path parts
 * @param {File} file - File object
 * @param {string} relativePath - Full root-relative path
 * @param {string} currentPath - Current folder path
 */
function addFileToTree(level, fileRegistry, parts, file, relativePath, currentPath = '') {
    const name = parts[0];
    let node = level.find(item => item.name === name);
    const isFile = parts.length === 1;
    const nodeRelativePath = isFile ? relativePath : joinRelativePath(currentPath, name);

    if (!node) {
        if (isFile) {
            const id = Math.random().toString(36).substr(2, 9);
            fileRegistry[id] = file;
            node = createNode(name, 'file', id, nodeRelativePath);
        } else {
            node = createNode(name, 'folder', null, nodeRelativePath);
        }

        level.push(node);
    }

    if (!isFile) {
        addFileToTree(node.children, fileRegistry, parts.slice(1), file, relativePath, nodeRelativePath);
    }
}

/**
 * Resolve which baseline to compare against.
 * @param {string} rootName - Root folder name
 * @param {string[]} currentPaths - Current root-relative paths
 * @param {Object} options - Upload options
 * @returns {Object} Comparison settings
 */
function resolveComparisonBaseline(rootName, currentPaths, options) {
    const inMemoryBaseline = uploadBaseline && uploadBaseline.rootName === rootName ? uploadBaseline : null;
    const storedBaseline = getStoredBaseline(rootName);
    const shouldAutoUseStoredBaseline = !options.diff && !inMemoryBaseline && !!storedBaseline;
    const candidate = options.diff
        ? (inMemoryBaseline || storedBaseline)
        : (shouldAutoUseStoredBaseline ? storedBaseline : null);

    if (!candidate) {
        return {
            shouldDiff: false,
            baseline: null,
            source: null,
            warning: null
        };
    }

    const validation = validateBaseline(candidate, rootName, currentPaths);
    if (!validation.valid) {
        return {
            shouldDiff: false,
            baseline: null,
            source: null,
            warning: options.diff || shouldAutoUseStoredBaseline
                ? 'Saved baseline ignored because this upload does not look like the same project.'
                : null
        };
    }

    return {
        shouldDiff: options.diff || shouldAutoUseStoredBaseline,
        baseline: candidate,
        source: inMemoryBaseline === candidate ? 'memory' : 'storage',
        warning: shouldAutoUseStoredBaseline ? 'Loaded against your saved baseline.' : null
    };
}

/**
 * Apply diff metadata to the tree.
 * @param {Object} rootNode - Root folder node
 * @param {string} rootName - Root folder name
 * @param {Object} currentFingerprints - Current fingerprints
 * @param {Object} baseline - Baseline snapshot
 * @returns {Object} Diff result
 */
function applyDiff(rootNode, rootName, currentFingerprints, baseline) {
    const previousFingerprints = baseline.fingerprints || {};
    const previousPaths = Object.keys(previousFingerprints);
    const currentPaths = Object.keys(currentFingerprints);
    const currentPathSet = new Set(currentPaths);
    const deletedPaths = previousPaths.filter(path => {
        return !currentPathSet.has(path);
    });
    const newPaths = currentPaths.filter(path => {
        return !(path in previousFingerprints);
    });
    const renameMap = detectRenames(newPaths, deletedPaths, currentFingerprints, previousFingerprints);
    const deletedOnlyPaths = deletedPaths.filter(path => {
        return !renameMap.deletedToRenamed.has(path);
    });

    const summary = {
        new: 0,
        modified: 0,
        renamed: renameMap.newToPrevious.size,
        deleted: deletedOnlyPaths.length,
        unchanged: 0,
        totalChanged: 0
    };

    applyDiffToNode(rootNode, rootName, currentFingerprints, previousFingerprints, renameMap.newToPrevious, summary, true);
    appendDeletedNodes(rootNode, rootName, deletedOnlyPaths);
    updateFolderSelection(rootNode, true);

    summary.totalChanged = summary.new + summary.modified + summary.renamed + summary.deleted;

    return {
        summary,
        deletedPaths: deletedOnlyPaths,
        renamedPaths: renameMap.newToPrevious
    };
}

/**
 * Mark a tree as a normal full upload.
 * @param {Object} node - Root node
 */
function markTreeAsFullUpload(node) {
    node.checked = true;
    node.diffStatus = 'none';
    node.diffMeta = null;

    if (!node.children) {
        return;
    }

    node.children.forEach(child => {
        child.checked = true;
        child.diffStatus = 'none';
        child.diffMeta = null;
        child.virtual = false;

        if (child.type === 'folder') {
            child.collapsed = child.relativePath !== '';
            markTreeAsFullUpload(child);
        }
    });
}

/**
 * Apply diff metadata to a single tree node.
 * @param {Object} node - Tree node
 * @param {string} rootName - Root folder name
 * @param {Object} currentFingerprints - Current fingerprints
 * @param {Object} previousFingerprints - Previous fingerprints
 * @param {Map} renamedPaths - Renamed new path => old path
 * @param {Object} summary - Diff summary
 * @param {boolean} isRoot - Whether this is the root node
 * @returns {boolean} True if the node or descendants are checked
 */
function applyDiffToNode(node, rootName, currentFingerprints, previousFingerprints, renamedPaths, summary, isRoot = false) {
    if (node.type === 'file') {
        const previousFingerprint = previousFingerprints[node.relativePath];
        const renamedFrom = renamedPaths.get(node.relativePath);

        if (renamedFrom) {
            node.diffStatus = 'renamed';
            node.diffMeta = {
                previousPath: `${rootName}/${renamedFrom}`
            };
            node.checked = true;
            return true;
        }

        if (!(node.relativePath in previousFingerprints)) {
            node.diffStatus = 'new';
            node.diffMeta = null;
            node.checked = true;
            summary.new++;
            return true;
        }

        if (previousFingerprint !== currentFingerprints[node.relativePath]) {
            node.diffStatus = 'modified';
            node.diffMeta = null;
            node.checked = true;
            summary.modified++;
            return true;
        }

        node.diffStatus = 'unchanged';
        node.diffMeta = null;
        node.checked = false;
        summary.unchanged++;
        return false;
    }

    let hasCheckedChild = false;
    node.children.forEach(child => {
        hasCheckedChild = applyDiffToNode(
            child,
            rootName,
            currentFingerprints,
            previousFingerprints,
            renamedPaths,
            summary
        ) || hasCheckedChild;
    });

    node.checked = isRoot ? true : hasCheckedChild;
    node.collapsed = isRoot ? false : !hasCheckedChild;
    node.diffStatus = 'none';
    return hasCheckedChild;
}

/**
 * Append virtual deleted files to the tree.
 * @param {Object} rootNode - Root folder node
 * @param {string} rootName - Root folder name
 * @param {string[]} deletedPaths - Deleted root-relative paths
 */
function appendDeletedNodes(rootNode, rootName, deletedPaths) {
    if (!deletedPaths.length) {
        return;
    }

    const deletedFolder = createNode('[Deleted Files]', 'folder', null, '__deleted__', {
        diffStatus: 'deleted'
    });
    deletedFolder.collapsed = false;
    deletedFolder.checked = true;

    deletedPaths.sort().forEach(relativePath => {
        deletedFolder.children.push(createNode(relativePath, 'file', null, relativePath, {
            outputPath: `${rootName}/${relativePath}`,
            diffStatus: 'deleted',
            diffMeta: {
                previousPath: `${rootName}/${relativePath}`
            },
            virtual: true
        }));
    });

    rootNode.children.push(deletedFolder);
}

/**
 * Detect renamed files by matching fingerprints.
 * @param {string[]} newPaths - New root-relative paths
 * @param {string[]} deletedPaths - Deleted root-relative paths
 * @param {Object} currentFingerprints - Current fingerprints
 * @param {Object} previousFingerprints - Previous fingerprints
 * @returns {Object} Rename maps
 */
function detectRenames(newPaths, deletedPaths, currentFingerprints, previousFingerprints) {
    const deletedByFingerprint = new Map();

    deletedPaths.forEach(path => {
        const fingerprint = previousFingerprints[path];
        if (!deletedByFingerprint.has(fingerprint)) {
            deletedByFingerprint.set(fingerprint, []);
        }
        deletedByFingerprint.get(fingerprint).push(path);
    });

    const newToPrevious = new Map();
    const deletedToRenamed = new Map();

    [...newPaths].sort().forEach(path => {
        const fingerprint = currentFingerprints[path];
        const candidates = deletedByFingerprint.get(fingerprint);

        if (!candidates || !candidates.length) {
            return;
        }

        const previousPath = candidates.shift();
        newToPrevious.set(path, previousPath);
        deletedToRenamed.set(previousPath, path);
    });

    return {
        newToPrevious,
        deletedToRenamed
    };
}

/**
 * Update folder selection after diff metadata has been applied.
 * @param {Object} node - Tree node
 * @param {boolean} isRoot - Whether this node is the root node
 * @returns {boolean} True if checked descendants exist
 */
function updateFolderSelection(node, isRoot = false) {
    if (node.type === 'file') {
        return node.checked;
    }

    let hasCheckedChild = false;
    node.children.forEach(child => {
        hasCheckedChild = updateFolderSelection(child) || hasCheckedChild;
    });

    node.checked = isRoot ? true : hasCheckedChild;
    node.collapsed = isRoot ? false : !hasCheckedChild;
    return hasCheckedChild;
}

/**
 * Build a human-readable diff status message.
 * @param {Object} summary - Diff summary
 * @param {string|null} warning - Optional warning
 * @param {string|null} source - Baseline source
 * @returns {string} Status message
 */
function buildDiffStatusMessage(summary, warning, source) {
    if (summary.totalChanged === 0) {
        return `No file changes detected.${warning ? ` ${warning}` : ''}`;
    }

    const parts = [];
    if (summary.new) {
        parts.push(`${summary.new} new`);
    }
    if (summary.modified) {
        parts.push(`${summary.modified} modified`);
    }
    if (summary.renamed) {
        parts.push(`${summary.renamed} renamed`);
    }
    if (summary.deleted) {
        parts.push(`${summary.deleted} deleted`);
    }

    const prefix = source === 'storage' ? 'Saved diff ready' : 'Diff ready';
    return `${prefix}: ${parts.join(', ')}.${warning ? ` ${warning}` : ''}`;
}

/**
 * Check if file path should be ignored.
 * @param {string} path - File path
 * @returns {boolean} True if should ignore
 */
function shouldIgnorePath(path) {
    return IGNORE_FOLDERS.some(folder => {
        return path.includes(`/${folder}/`) || path.startsWith(`${folder}/`);
    });
}

/**
 * Check if file should be ignored.
 * @param {string} name - File name
 * @returns {boolean} True if should ignore
 */
function shouldIgnoreFile(name) {
    return name.startsWith('.') || IGNORE_EXTS.some(extension => {
        return name.toLowerCase().endsWith(extension);
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
 * Read all entries from a DirectoryReader.
 * @param {DirectoryReader} reader - Directory reader
 * @returns {Promise<Array>} All entries
 */
function readEntriesAll(reader) {
    return new Promise(resolve => {
        let all = [];

        const read = () => {
            reader.readEntries(entries => {
                if (!entries.length) {
                    resolve(all);
                    return;
                }

                all = all.concat(entries);
                read();
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
    return new Promise((resolve, reject) => {
        entry.file(resolve, reject);
    });
}
