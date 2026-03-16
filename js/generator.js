/**
 * Generate ASCII tree and context output.
 */

import { currentDiff, getFile } from './state.js';
import { readFile } from './file-handler.js';
import { hasCheckedChildren } from './tree.js';

/**
 * Generate ASCII tree structure.
 * @param {Array} nodes - Tree nodes
 * @param {string} prefix - Current prefix
 * @param {boolean} includeEmpty - Include empty folders
 * @returns {string} ASCII tree
 */
export function generateAsciiTree(nodes, prefix = '', includeEmpty = false) {
    let output = '';

    const activeNodes = nodes.filter(node => {
        if (!node.checked) {
            return false;
        }

        if (node.type === 'folder' && !includeEmpty) {
            return hasCheckedChildren(node);
        }

        return true;
    });

    activeNodes.forEach((node, index) => {
        const isLast = index === activeNodes.length - 1;
        const marker = isLast ? '└── ' : '├── ';
        const suffix = buildTreeSuffix(node);

        output += `${prefix}${marker}${node.name}${node.type === 'folder' ? '/' : ''}${suffix}\n`;

        if (node.children && node.children.length > 0) {
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            output += generateAsciiTree(node.children, newPrefix, includeEmpty);
        }
    });

    return output;
}

/**
 * Collect all checked entries.
 * @param {Array} rootStructure - Root tree nodes
 * @returns {Array} Checked entries
 */
export function collectCheckedEntries(rootStructure) {
    const list = [];

    function collect(nodes, path) {
        nodes.forEach(node => {
            if (!node.checked) {
                return;
            }

            const fullPath = path ? `${path}/${node.name}` : node.name;
            const outputPath = node.outputPath || fullPath;

            if (node.type === 'file') {
                list.push({
                    id: node.id,
                    path: outputPath,
                    diffStatus: node.diffStatus,
                    diffMeta: node.diffMeta,
                    virtual: node.virtual
                });
                return;
            }

            if (node.children) {
                collect(node.children, fullPath);
            }
        });
    }

    collect(rootStructure, '');
    return list;
}

/**
 * Generate complete context output.
 * @param {Array} rootStructure - Root tree nodes
 * @param {boolean} showTree - Include ASCII tree
 * @param {boolean} includeEmpty - Include empty folders
 * @returns {Promise<Object>} Generated output and count
 */
export async function generateOutput(rootStructure, showTree, includeEmpty) {
    let finalOutput = '';

    if (currentDiff) {
        finalOutput += buildDiffSummary(currentDiff.summary);
        finalOutput += '--------------------------------------------------\n\n';
    }

    if (showTree) {
        finalOutput += 'Project Structure:\n';
        finalOutput += '.\n';
        finalOutput += generateAsciiTree(rootStructure, '', includeEmpty);
        finalOutput += '\n--------------------------------------------------\n\n';
    }

    const entries = collectCheckedEntries(rootStructure);
    let count = 0;

    for (const entry of entries) {
        if (entry.virtual || entry.diffStatus === 'deleted') {
            finalOutput += `DELETED_FILE: ${entry.path}\n---\n\n`;
            count++;
            continue;
        }

        const file = getFile(entry.id);
        if (!file) {
            continue;
        }

        try {
            const text = await readFile(file);
            finalOutput += buildEntryHeader(entry);
            finalOutput += `FILE_PATH: ${entry.path}\n\`\`\`\n${text}\n\`\`\`\n---\n\n`;
            count++;
        } catch (error) {
            console.error(`Error reading file ${entry.path}:`, error);
        }
    }

    if (count === 0 && !showTree && !currentDiff) {
        finalOutput = 'No files selected.';
    } else if (count === 0) {
        finalOutput += 'No files selected.';
    }

    return { output: finalOutput, count };
}

/**
 * Build a tree suffix for diff states.
 * @param {Object} node - Tree node
 * @returns {string} Suffix text
 */
function buildTreeSuffix(node) {
    if (!['new', 'modified', 'renamed', 'deleted'].includes(node.diffStatus)) {
        return '';
    }

    return ` [${node.diffStatus}]`;
}

/**
 * Build a diff summary block.
 * @param {Object} summary - Diff summary
 * @returns {string} Summary block
 */
function buildDiffSummary(summary) {
    return [
        'Diff Summary:',
        `New Files: ${summary.new}`,
        `Modified Files: ${summary.modified}`,
        `Renamed Files: ${summary.renamed}`,
        `Deleted Files: ${summary.deleted}`,
        ''
    ].join('\n');
}

/**
 * Build header lines for a diff entry.
 * @param {Object} entry - Output entry
 * @returns {string} Header text
 */
function buildEntryHeader(entry) {
    if (entry.diffStatus === 'new') {
        return 'NEW_FILE:\n';
    }

    if (entry.diffStatus === 'modified') {
        return 'UPDATED_FILE:\n';
    }

    if (entry.diffStatus === 'renamed') {
        return `RENAMED_FILE: ${entry.diffMeta?.previousPath || 'Unknown'} -> ${entry.path}\n`;
    }

    return '';
}
