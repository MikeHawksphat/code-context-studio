/**
 * Persistent storage helpers for upload baselines.
 */

const STORAGE_KEY = 'ccs.uploadBaselines.v2';
const SAMPLE_SIZE = 40;

/**
 * Build a baseline snapshot from current fingerprints.
 * @param {string} rootName - Root folder name
 * @param {Object} fingerprints - Fingerprints by root-relative path
 * @returns {Object} Baseline snapshot
 */
export function buildBaseline(rootName, fingerprints) {
    const paths = Object.keys(fingerprints).sort();

    return {
        rootName,
        fingerprints,
        fileCount: paths.length,
        topLevelNames: collectTopLevelNames(paths),
        samplePaths: samplePaths(paths),
        updatedAt: Date.now()
    };
}

/**
 * Load a stored baseline for a root folder name.
 * @param {string} rootName - Root folder name
 * @returns {Object|null} Stored baseline or null
 */
export function getStoredBaseline(rootName) {
    const baselines = loadStoredBaselines();
    return baselines[rootName] || null;
}

/**
 * Persist a baseline snapshot.
 * @param {Object} baseline - Baseline snapshot
 */
export function saveStoredBaseline(baseline) {
    const baselines = loadStoredBaselines();
    baselines[baseline.rootName] = baseline;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(baselines));
    } catch (error) {
        console.warn('Unable to persist upload baseline:', error);
    }
}

/**
 * Validate whether a stored baseline looks like the same project.
 * @param {Object} baseline - Stored baseline
 * @param {string} rootName - Current root folder name
 * @param {string[]} currentPaths - Current root-relative paths
 * @returns {Object} Validation result
 */
export function validateBaseline(baseline, rootName, currentPaths) {
    if (!baseline || baseline.rootName !== rootName) {
        return {
            valid: false,
            reason: 'The saved baseline belongs to a different root folder.'
        };
    }

    const previousPaths = Object.keys(baseline.fingerprints || {});
    if (previousPaths.length === 0 || currentPaths.length === 0) {
        return { valid: true };
    }

    const currentTopLevelNames = collectTopLevelNames(currentPaths);
    const currentSamplePaths = samplePaths(currentPaths);

    const topLevelOverlap = calculateOverlapRatio(baseline.topLevelNames || [], currentTopLevelNames);
    const sampleOverlap = calculateOverlapRatio(baseline.samplePaths || [], currentSamplePaths);
    const pathOverlap = calculateOverlapRatio(previousPaths, currentPaths);

    if (topLevelOverlap >= 0.5 || sampleOverlap >= 0.25 || pathOverlap >= 0.2) {
        return {
            valid: true,
            topLevelOverlap,
            sampleOverlap,
            pathOverlap
        };
    }

    return {
        valid: false,
        reason: 'The saved baseline does not look like the same project.',
        topLevelOverlap,
        sampleOverlap,
        pathOverlap
    };
}

/**
 * Load all stored baselines.
 * @returns {Object} Baseline map
 */
function loadStoredBaselines() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.warn('Unable to read stored baselines:', error);
        return {};
    }
}

/**
 * Collect unique top-level names from root-relative paths.
 * @param {string[]} paths - Root-relative paths
 * @returns {string[]} Top-level names
 */
function collectTopLevelNames(paths) {
    return [...new Set(paths.map(path => path.split('/')[0]))].sort();
}

/**
 * Sample sorted paths to keep validation lightweight.
 * @param {string[]} paths - Root-relative paths
 * @returns {string[]} Sampled paths
 */
function samplePaths(paths) {
    if (paths.length <= SAMPLE_SIZE) {
        return [...paths].sort();
    }

    const sorted = [...paths].sort();
    const sample = [];

    for (let i = 0; i < SAMPLE_SIZE; i++) {
        const index = Math.floor((i * sorted.length) / SAMPLE_SIZE);
        sample.push(sorted[index]);
    }

    return [...new Set(sample)];
}

/**
 * Calculate overlap ratio between two string collections.
 * @param {string[]} left - First collection
 * @param {string[]} right - Second collection
 * @returns {number} Overlap ratio
 */
function calculateOverlapRatio(left, right) {
    const leftSet = new Set(left);
    const rightSet = new Set(right);

    let matches = 0;
    leftSet.forEach(value => {
        if (rightSet.has(value)) {
            matches++;
        }
    });

    return matches / Math.max(1, Math.min(leftSet.size, rightSet.size));
}
