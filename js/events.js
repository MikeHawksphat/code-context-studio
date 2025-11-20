/**
 * Event listeners and handlers.
 */

import { elements } from './constants.js';
import { setStatus, renderTree } from './ui.js';
import { generateOutput } from './generator.js';
import { processInputFiles, processEntry } from './upload.js';
import { toggleCheck } from './tree.js';
import { rootStructure } from './state.js';

/**
 * Initialize event listeners.
 */
export function initializeEvents() {
    // File upload
    elements.folderInput.addEventListener('change', handleFileInput);

    // Drag and drop
    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('dragleave', handleDragLeave);
    elements.dropZone.addEventListener('drop', handleDrop);

    // Sidebar resizer
    initializeResizer();

    // Generate button
    elements.generateBtn.addEventListener('click', handleGenerate);

    // Copy button
    elements.copyBtn.addEventListener('click', handleCopy);

    // Reset button
    elements.resetBtn.addEventListener('click', handleReset);
}

/**
 * Handle file input change.
 * @param {Event} e - Change event
 */
async function handleFileInput(e) {
    if (e.target.files.length > 0) {
        setStatus('Processing files...');
        await processInputFiles(e.target.files);
    }
}

/**
 * Handle drag over event.
 * @param {DragEvent} e - Drag event
 */
function handleDragOver(e) {
    e.preventDefault();
    elements.dropZone.classList.add('dragover');
}

/**
 * Handle drag leave event.
 */
function handleDragLeave() {
    elements.dropZone.classList.remove('dragover');
}

/**
 * Handle drop event.
 * @param {DragEvent} e - Drag event
 */
async function handleDrop(e) {
    e.preventDefault();
    elements.dropZone.classList.remove('dragover');

    const items = e.dataTransfer.items;
    if (!items || !items.length) {
        return;
    }

    const entry = items[0].webkitGetAsEntry();
    if (entry && entry.isDirectory) {
        setStatus('Scanning directory...');
        await processEntry(entry);
    } else {
        alert('Please drop a folder.');
    }
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

    document.addEventListener('mousemove', (e) => {
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
        if (isResizing) {
            isResizing = false;
            elements.resizer.classList.remove('resizing');
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        }
    });
}

/**
 * Handle generate button click.
 */
async function handleGenerate() {
    const btn = elements.generateBtn;
    const oldHtml = btn.innerHTML;

    btn.innerHTML = `<svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg> Processing...`;

    await new Promise(r => setTimeout(r, 50));

    elements.preview.value = '';
    setStatus('Generating...');

    try {
        const { output, count } = await generateOutput(
            rootStructure,
            elements.optTree.checked,
            elements.optEmpty.checked
        );

        elements.preview.value = output;
        setStatus(`Generated context from ${count} files.`);
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
    rootStructure.forEach(n => toggleCheck(n, value));
    renderTree(rootStructure);
}
