/**
 * Hash worker for file fingerprinting.
 */

self.addEventListener('message', async event => {
    const { id, buffer } = event.data;

    try {
        const digest = await crypto.subtle.digest('SHA-256', buffer);
        const hash = Array.from(new Uint8Array(digest), value => {
            return value.toString(16).padStart(2, '0');
        }).join('');

        self.postMessage({ id, hash });
    } catch (error) {
        self.postMessage({
            id,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
