/**
 * Generate ASCII tree and context output.
 */

import { hasCheckedChildren } from './tree.js';
import { getFile } from './state.js';
import { readFile } from './file-handler.js';
import { elements } from './constants.js';
import { setStatus } from './ui.js';

/**
 * Generate ASCII tree structure.
 * @param {Array} nodes - Tree nodes
 * @param {string} prefix - Current prefix
 * @param {boolean} includeEmpty - Include empty folders
 * @returns {string} ASCII tree
 */
export function generateAsciiTree(nodes, prefix = '', includeEmpty = false) {
    let output = '';

    // Filter nodes based on checked status and empty folder setting
    const activeNodes = nodes.filter(n => {
        if (!n.checked) {
            return false;
        }

        if (n.type === 'folder' && !includeEmpty) {
            // Check if folder has any checked children (recursively)
            return hasCheckedChildren(n);
        }

        return true;
    });

    activeNodes.forEach((node, index) => {
        const isLast = index === activeNodes.length - 1;
        const marker = isLast ? '└── ' : '├── ';
        output += prefix + marker + node.name + (node.type === 'folder' ? '/' : '') + '\n';

        if (node.children && node.children.length > 0) {
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            output += generateAsciiTree(node.children, newPrefix, includeEmpty);
        }
    });

    return output;
}

/**
 * Collect all checked files.
 * @param {Array} rootStructure - Root tree nodes
 * @returns {Array} Array of {id, path} objects
 */
export function collectCheckedFiles(rootStructure) {
    const list = [];

    function collect(nodes, path) {
        nodes.forEach(n => {
            if (!n.checked) {
                return;
            }

            let fullPath = path ? `${path}/${n.name}` : n.name;

            if (n.type === 'file') {
                list.push({ id: n.id, path: fullPath });
            } else if (n.children) {
                collect(n.children, fullPath);
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
 * @returns {Promise<string>} Generated output
 */
export async function generateOutput(rootStructure, showTree, includeEmpty) {
    let finalOutput = '';

    // 1. ASCII Tree
    if (showTree) {
        finalOutput += 'Project Structure:\n';
        finalOutput += '.\n';
        finalOutput += generateAsciiTree(rootStructure, '', includeEmpty);
        finalOutput += '\n--------------------------------------------------\n\n';
    }

    // 2. File Content
    const fileList = collectCheckedFiles(rootStructure);
    let count = 0;

    for (const item of fileList) {
        const file = getFile(item.id);
        if (!file) {
            continue;
        }

        try {
            const text = await readFile(file);
            finalOutput += `FILE_PATH: ${item.path}\n\`\`\`\n${text}\n\`\`\`\n---\n\n`;
            count++;
        } catch (e) {
            console.error(`Error reading file ${item.path}:`, e);
        }
    }

    if (count === 0 && !showTree) {
        finalOutput = 'No files selected.';
    }

    return { output: finalOutput, count };
}
