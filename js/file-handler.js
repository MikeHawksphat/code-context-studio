/**
 * File reading and utility functions.
 */

const HASH_SIZE_LIMIT = 5_000_000;
let hashWorker = null;
let workerRequestId = 0;
const pendingHashes = new Map();

/**
 * Read file contents as text.
 * @param {File} file - File object
 * @returns {Promise<string>} File contents
 */
export function readFile(file) {
    return new Promise((res, rej) => {
        // Skip large files (>1MB)
        if (file.size > 1000000) {
            res('(Skipped - Large File)');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsText(file);
    });
}

/**
 * Build a stable fingerprint for diff detection.
 * Small files are hashed by content; large files fall back to metadata.
 * @param {File} file - File object
 * @returns {Promise<string>} Fingerprint string
 */
export async function createFileFingerprint(file) {
    if (file.size > HASH_SIZE_LIMIT) {
        return `meta:${file.size}:${file.lastModified}`;
    }

    if (!globalThis.crypto?.subtle) {
        return `meta:${file.size}:${file.lastModified}`;
    }

    const buffer = await file.arrayBuffer();
    const hash = await hashBuffer(buffer);

    return `sha256:${hash}`;
}

/**
 * Hash a buffer using a worker when possible.
 * @param {ArrayBuffer} buffer - Buffer to hash
 * @returns {Promise<string>} Hex hash
 */
async function hashBuffer(buffer) {
    const worker = getHashWorker();
    if (!worker) {
        return hashBufferOnMainThread(buffer);
    }

    const id = ++workerRequestId;

    return new Promise((resolve, reject) => {
        pendingHashes.set(id, { resolve, reject });
        worker.postMessage({ id, buffer });
    }).catch(() => {
        return hashBufferOnMainThread(buffer);
    });
}

/**
 * Hash a buffer on the main thread as fallback.
 * @param {ArrayBuffer} buffer - Buffer to hash
 * @returns {Promise<string>} Hex hash
 */
async function hashBufferOnMainThread(buffer) {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest), value => {
        return value.toString(16).padStart(2, '0');
    }).join('');
}

/**
 * Get or create the hash worker.
 * @returns {Worker|null} Hash worker
 */
function getHashWorker() {
    if (hashWorker !== null) {
        return hashWorker;
    }

    if (typeof Worker === 'undefined') {
        hashWorker = null;
        return hashWorker;
    }

    try {
        hashWorker = new Worker(new URL('./hash-worker.js', import.meta.url), {
            type: 'module'
        });

        hashWorker.addEventListener('message', event => {
            const { id, hash, error } = event.data;
            const pending = pendingHashes.get(id);

            if (!pending) {
                return;
            }

            pendingHashes.delete(id);

            if (error) {
                pending.reject(new Error(error));
                return;
            }

            pending.resolve(hash);
        });

        hashWorker.addEventListener('error', error => {
            console.warn('Hash worker failed, falling back to main thread:', error);
            hashWorker = null;

            pendingHashes.forEach(pending => {
                pending.reject(new Error('Hash worker unavailable'));
            });
            pendingHashes.clear();
        });
    } catch (error) {
        console.warn('Unable to create hash worker:', error);
        hashWorker = null;
    }

    return hashWorker;
}

/**
 * Read all entries from a DirectoryReader.
 * @param {DirectoryReader} reader - Directory reader
 * @returns {Promise<Array>} All entries
 */
export function readEntriesAll(reader) {
    return new Promise(res => {
        let all = [];
        let read = () => {
            reader.readEntries(r => {
                if (!r.length) {
                    res(all);
                } else {
                    all = all.concat(r);
                    read();
                }
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
export function entryFile(entry) {
    return new Promise((res, rej) => {
        entry.file(res, rej);
    });
}
