/**
 * Tree data structure operations.
 */

/**
 * Create a new tree node.
 * @param {string} name - Node name
 * @param {string} type - Node type ('file' or 'folder')
 * @param {string} id - Optional node ID
 * @returns {Object} New tree node
 */
export function createNode(name, type, id = null) {
    return {
        id: id || Math.random().toString(36).substr(2, 9),
        name: name,
        type: type,
        children: type === 'folder' ? [] : null,
        collapsed: type === 'folder',
        checked: true
    };
}

/**
 * Sort tree nodes recursively (folders first, then alphabetically).
 * @param {Array} nodes - Array of tree nodes
 */
export function sortTree(nodes) {
    nodes.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => {
        if (n.children) {
            sortTree(n.children);
        }
    });
}

/**
 * Toggle check state of a node and all its children.
 * @param {Object} node - Tree node
 * @param {boolean} state - Check state
 */
export function toggleCheck(node, state) {
    node.checked = state;
    if (node.children) {
        node.children.forEach(c => toggleCheck(c, state));
    }
}

/**
 * Check if a folder node has any checked children (recursively).
 * @param {Object} folderNode - Folder node
 * @returns {boolean} True if has checked children
 */
export function hasCheckedChildren(folderNode) {
    if (!folderNode.children) {
        return false;
    }
    return folderNode.children.some(c => {
        return c.checked && (c.type === 'file' || hasCheckedChildren(c));
    });
}
