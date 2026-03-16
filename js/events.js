/**
 * Event listeners and handlers.
 */

import { elements } from './constants.js';
import { generateOutput } from './generator.js';
import {
    pendingUploadMode,
    rootStructure,
    setPendingUploadMode,
    setTreeFilter,
    uploadBaseline
} from './state.js';
import { toggleCheck } from './tree.js';
import { setStatus, renderTree, updateToolbarState } from './ui.js';
import { processEntry, processInputFiles } from './upload.js';

/**
 * Initialize event listeners.
 */
export function initializeEvents() {
    elements.folderInput.addEventListener('change', handleFileInput);

    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('dragleave', handleDragLeave);
    elements.dropZone.addEventListener('drop', handleDrop);

    elements.contentArea.addEventListener('dragover', handleDragOver);
    elements.contentArea.addEventListener('dragleave', handleDragLeave);
    elements.contentArea.addEventListener('drop', handleDrop);

    initializeResizer();

    elements.generateBtn.addEventListener('click', handleGenerate);
    elements.copyBtn.addEventListener('click', handleCopy);
    elements.diffBtn.addEventListener('click', handleDiffUpload);
    elements.filterSelect.addEventListener('change', handleFilterChange);
    elements.resetBtn.addEventListener('click', handleReset);
}

/**
 * Handle file input change.
 * @param {Event} e - Change event
 */
async function handleFileInput(e) {
    if (!e.target.files.length) {
        return;
    }

    const isDiffUpload = pendingUploadMode === 'diff' && !!uploadBaseline;
    setStatus(isDiffUpload ? 'Comparing folder changes...' : 'Processing files...');
    await processInputFiles(e.target.files, { diff: isDiffUpload });
    clearPendingUploadMode();
    e.target.value = '';
}

/**
 * Handle drag over event.
 * @param {DragEvent} e - Drag event
 */
function handleDragOver(e) {
    e.preventDefault();
    elements.dropZone.classList.add('dragover');
    elements.contentArea.classList.add('dragover');
}

/**
 * Handle drag leave event.
 * @param {DragEvent} e - Drag event
 */
function handleDragLeave(e) {
    if (e.currentTarget === elements.contentArea && elements.contentArea.contains(e.relatedTarget)) {
        return;
    }

    elements.dropZone.classList.remove('dragover');
    elements.contentArea.classList.remove('dragover');
}

/**
 * Handle drop event.
 * @param {DragEvent} e - Drag event
 */
async function handleDrop(e) {
    e.preventDefault();
    elements.dropZone.classList.remove('dragover');
    elements.contentArea.classList.remove('dragover');

    const items = e.dataTransfer.items;
    if (!items || !items.length) {
        return;
    }

    const entry = items[0].webkitGetAsEntry();
    if (!entry || !entry.isDirectory) {
        alert('Please drop a folder.');
        return;
    }

    const isDiffUpload = pendingUploadMode === 'diff' && !!uploadBaseline;
    setStatus(isDiffUpload ? 'Comparing dropped folder...' : 'Scanning directory...');
    await processEntry(entry, { diff: isDiffUpload });
    clearPendingUploadMode();
}

/**
 * Toggle diff reupload mode.
 */
function handleDiffUpload() {
    if (!uploadBaseline) {
        return;
    }

    if (pendingUploadMode === 'diff') {
        clearPendingUploadMode();
        setStatus('Diff upload canceled.');
        return;
    }

    setPendingUploadMode('diff');
    updateToolbarState();
    setStatus('Drop the updated folder anywhere in the app, or choose it from the picker.');
    elements.folderInput.click();
}

/**
 * Handle tree filter changes.
 * @param {Event} e - Change event
 */
function handleFilterChange(e) {
    setTreeFilter(e.target.value);
    renderTree(rootStructure);
}

/**
 * Initialize sidebar resizer.
 */
function initializeResizer() {
    let isResizing = false;

    elements.resizer.addEventListener('mousedown', () => {
        isResizing = true;
        elements.resizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', e => {
        if (!isResizing) {
            return;
        }

        let width = e.clientX;
        if (width < 200) {
            width = 200;
        }
        if (width > 800) {
            width = 800;
        }

        elements.sidebar.style.width = `${width}px`;
    });

    document.addEventListener('mouseup', () => {
        if (!isResizing) {
            return;
        }

        isResizing = false;
        elements.resizer.classList.remove('resizing');
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    });
}

/**
 * Handle generate button click.
 */
async function handleGenerate() {
    const btn = elements.generateBtn;
    const oldHtml = btn.innerHTML;

    btn.innerHTML = `<svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg> Processing...`;

    await new Promise(resolve => setTimeout(resolve, 50));

    elements.preview.value = '';
    setStatus('Generating...');

    try {
        const { output, count } = await generateOutput(
            rootStructure,
            elements.optTree.checked,
            elements.optEmpty.checked
        );

        elements.preview.value = output;
        setStatus(`Generated output from ${count} entries.`);
    } catch (error) {
        console.error('Error generating output:', error);
        setStatus('Error generating output.');
    }

    btn.innerHTML = oldHtml;
}

/**
 * Handle copy button click.
 */
function handleCopy() {
    if (!elements.preview.value) {
        return;
    }

    elements.preview.select();
    navigator.clipboard.writeText(elements.preview.value);

    const original = elements.copyBtn.innerHTML;
    elements.copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;

    setTimeout(() => {
        elements.copyBtn.innerHTML = original;
    }, 1500);
}

/**
 * Handle reset button click.
 */
function handleReset() {
    location.reload();
}

/**
 * Handle toggle all (check/uncheck all files).
 * @param {boolean} value - Check state
 */
export function handleToggleAll(value) {
    rootStructure.forEach(node => toggleCheck(node, value));
    renderTree(rootStructure);
}

/**
 * Clear pending diff-upload mode.
 */
function clearPendingUploadMode() {
    setPendingUploadMode('normal');
    updateToolbarState();
}
