/**
 * File reading and utility functions.
 */

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
    if (file.size > 1000000) {
        return `meta:${file.size}:${file.lastModified}`;
    }

    if (!globalThis.crypto?.subtle) {
        return `meta:${file.size}:${file.lastModified}`;
    }

    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const hash = Array.from(new Uint8Array(digest), b => {
        return b.toString(16).padStart(2, '0');
    }).join('');

    return `sha256:${hash}`;
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
