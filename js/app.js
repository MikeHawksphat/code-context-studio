/**
 * Application entry point.
 */

import { initializeEvents, handleToggleAll } from './events.js';

/**
 * Initialize the application.
 */
function initialize() {
    // Make handleToggleAll globally available for HTML onclick handlers
    window.toggleAll = handleToggleAll;

    // Initialize all event listeners
    initializeEvents();

    // Application is ready
    console.log('Code Context Studio initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
