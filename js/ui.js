/**
 * UI rendering functions.
 */

import { ICONS, elements } from './constants.js';
import { currentDiff, pendingUploadMode, treeFilter } from './state.js';
import { toggleCheck } from './tree.js';

/**
 * Render the entire file tree.
 * @param {Array} rootStructure - Root tree nodes
 */
export function renderTree(rootStructure) {
    elements.fileTree.innerHTML = '';

    rootStructure.forEach(node => {
        if (shouldRenderNode(node)) {
            elements.fileTree.appendChild(buildNodeEl(node, 0, rootStructure));
        }
    });
}

/**
 * Build a DOM element for a tree node and its children.
 * @param {Object} node - Tree node
 * @param {number} depth - Node depth
 * @param {Array} rootStructure - Root tree nodes
 * @returns {HTMLElement} Tree node element
 */
export function buildNodeEl(node, depth, rootStructure) {
    const container = document.createElement('div');
    const row = document.createElement('div');
    row.className = `tree-item diff-${node.diffStatus || 'none'}`;
    row.style.paddingLeft = `${depth * 18 + 10}px`;

    row.onclick = () => {
        toggleCheck(node, !node.checked);
        renderTree(rootStructure);
    };

    row.ondblclick = e => {
        e.stopPropagation();
        if (node.type === 'folder') {
            node.collapsed = !node.collapsed;
            renderTree(rootStructure);
        }
    };

    const wrapper = document.createElement('div');
    wrapper.className = 'tree-content-wrapper';

    const toggle = document.createElement('div');
    if (node.type === 'folder') {
        toggle.className = 'tree-toggle';
        if (node.collapsed) {
            row.classList.add('collapsed');
        }
        toggle.innerHTML = ICONS.CHEVRON;
        toggle.onclick = e => {
            e.stopPropagation();
            node.collapsed = !node.collapsed;
            renderTree(rootStructure);
        };
    } else {
        toggle.className = 'spacer';
    }

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'tree-checkbox';
    cb.checked = node.checked;
    cb.onclick = e => {
        e.stopPropagation();
        toggleCheck(node, cb.checked);
        renderTree(rootStructure);
    };

    const icon = document.createElement('div');
    icon.innerHTML = node.type === 'folder' ? ICONS.FOLDER : ICONS.FILE;

    const textWrap = document.createElement('div');
    textWrap.className = 'tree-text';

    const txt = document.createElement('span');
    txt.textContent = node.name;
    txt.className = 'tree-name';
    txt.title = buildNodeTitle(node);
    textWrap.appendChild(txt);

    const badge = buildBadge(node);
    if (badge) {
        textWrap.appendChild(badge);
    }

    wrapper.append(toggle, cb, icon, textWrap);
    row.appendChild(wrapper);
    container.appendChild(row);

    if (node.type === 'folder' && !node.collapsed && node.children) {
        node.children.forEach(child => {
            if (shouldRenderNode(child)) {
                container.appendChild(buildNodeEl(child, depth + 1, rootStructure));
            }
        });
    }

    return container;
}

/**
 * Set status bar message.
 * @param {string} msg - Status message
 */
export function setStatus(msg) {
    elements.statusBar.textContent = msg;
}

/**
 * Sync toolbar controls with current UI state.
 */
export function updateToolbarState() {
    elements.filterSelect.disabled = !currentDiff;
    elements.filterSelect.value = currentDiff ? treeFilter : 'all';

    elements.diffBtn.classList.toggle('btn-active', pendingUploadMode === 'diff');
    elements.contentArea.classList.toggle('drop-diff-mode', pendingUploadMode === 'diff');

    if (pendingUploadMode === 'diff') {
        elements.diffBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36"></path><polyline points="21 3 21 9 15 9"></polyline></svg> Cancel Diff`;
        return;
    }

    elements.diffBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36"></path><polyline points="21 3 21 9 15 9"></polyline></svg> Reupload Diff`;
}

/**
 * Determine if a node should be rendered under the current filter.
 * @param {Object} node - Tree node
 * @returns {boolean} True if visible
 */
function shouldRenderNode(node) {
    if (treeFilter === 'all' || !currentDiff) {
        return true;
    }

    if (node.type === 'folder') {
        return node.children.some(child => shouldRenderNode(child));
    }

    if (treeFilter === 'changed') {
        return ['new', 'modified', 'renamed', 'deleted'].includes(node.diffStatus);
    }

    return node.diffStatus === treeFilter;
}

/**
 * Build a change badge element for a node.
 * @param {Object} node - Tree node
 * @returns {HTMLElement|null} Badge element
 */
function buildBadge(node) {
    if (!['new', 'modified', 'renamed', 'deleted'].includes(node.diffStatus)) {
        return null;
    }

    const badge = document.createElement('span');
    badge.className = `tree-badge badge-${node.diffStatus}`;
    badge.textContent = node.diffStatus;
    return badge;
}

/**
 * Build a tooltip for a node.
 * @param {Object} node - Tree node
 * @returns {string} Tooltip text
 */
function buildNodeTitle(node) {
    if (node.diffStatus === 'renamed' && node.diffMeta?.previousPath) {
        return `Renamed from ${node.diffMeta.previousPath}`;
    }

    if (node.diffStatus === 'deleted' && node.outputPath) {
        return `Deleted: ${node.outputPath}`;
    }

    return node.outputPath || node.relativePath || node.name;
}
