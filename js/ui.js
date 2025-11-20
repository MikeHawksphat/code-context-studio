/**
 * UI rendering functions.
 */

import { ICONS, elements } from './constants.js';
import { toggleCheck } from './tree.js';

/**
 * Render the entire file tree.
 * @param {Array} rootStructure - Root tree nodes
 */
export function renderTree(rootStructure) {
    elements.fileTree.innerHTML = '';
    rootStructure.forEach(n => {
        elements.fileTree.appendChild(buildNodeEl(n, 0, rootStructure));
    });
}

/**
 * Build a DOM element for a tree node and its children.
 * @param {Object} node - Tree node
 * @param {number} depth - Node depth (for indentation)
 * @param {Array} rootStructure - Root tree nodes (for re-rendering)
 * @returns {HTMLElement} Tree node DOM element
 */
export function buildNodeEl(node, depth, rootStructure) {
    const container = document.createElement('div');
    const row = document.createElement('div');
    row.className = 'tree-item';
    row.style.paddingLeft = (depth * 18 + 10) + 'px';

    // Row click = Check
    row.onclick = (e) => {
        toggleCheck(node, !node.checked);
        renderTree(rootStructure);
    };

    // Row double click = Toggle Folder
    row.ondblclick = (e) => {
        e.stopPropagation();
        if (node.type === 'folder') {
            node.collapsed = !node.collapsed;
            renderTree(rootStructure);
        }
    };

    const wrapper = document.createElement('div');
    wrapper.className = 'tree-content-wrapper';

    // Chevron / Spacer
    const toggle = document.createElement('div');
    if (node.type === 'folder') {
        toggle.className = 'tree-toggle';
        if (node.collapsed) {
            row.classList.add('collapsed');
        }
        toggle.innerHTML = ICONS.CHEVRON;
        toggle.onclick = (e) => {
            e.stopPropagation();
            node.collapsed = !node.collapsed;
            renderTree(rootStructure);
        };
    } else {
        toggle.className = 'spacer';
    }

    // Checkbox
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'tree-checkbox';
    cb.checked = node.checked;
    cb.onclick = (e) => {
        e.stopPropagation();
        toggleCheck(node, cb.checked);
        renderTree(rootStructure);
    };

    // Icon
    const icon = document.createElement('div');
    icon.innerHTML = node.type === 'folder' ? ICONS.FOLDER : ICONS.FILE;

    // Label
    const txt = document.createElement('span');
    txt.textContent = node.name;
    txt.style.marginTop = '1px';

    wrapper.append(toggle, cb, icon, txt);
    row.appendChild(wrapper);
    container.appendChild(row);

    // Render children if folder is expanded
    if (node.type === 'folder' && !node.collapsed && node.children) {
        node.children.forEach(c => {
            container.appendChild(buildNodeEl(c, depth + 1, rootStructure));
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
