const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ApiOptions extends RequestInit {
    /** Skip automatic auth token injection */
    skipAuth?: boolean;
    /** Timeout in milliseconds (default: 30000) */
    timeout?: number;
    /** Number of retry attempts (default: 0 = no retry) */
    retries?: number;
    /** Callback on each retry attempt */
    onRetry?: (attempt: number, maxAttempts: number) => void;
}

/**
 * Sleep helper for exponential backoff
 */
function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) { reject(new DOMException("İstek iptal edildi.", "AbortError")); return; }
        const onAbort = () => { clearTimeout(timer); reject(new DOMException("İstek iptal edildi.", "AbortError")); };
        const timer = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, ms);
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}

function accountCacheScope(): string {
    if (typeof window === "undefined") return "anonymous";
    try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        return encodeURIComponent(String(user?.id || user?._id || user?.email || "anonymous"));
    } catch { return "anonymous"; }
}

/**
 * Fire-and-forget ping to wake up the Render backend during cold start.
 * Call this early on app mount so the backend starts warming while the
 * user is still looking at the UI shell / skeleton.
 */
let _warmupFired = false;
export function warmUpBackend(): void {
    if (_warmupFired || typeof window === "undefined") return;
    _warmupFired = true;
    fetch(`${API_BASE_URL}/ping`, { method: "GET", mode: "cors" }).catch(() => { });
}

/**
 * Stale-while-revalidate GET helper.
 * 1. Immediately returns cached data from sessionStorage (if any).
 * 2. Fires a fresh API request in the background.
 * 3. Calls `onFresh(data)` when the live response arrives.
 *
 * Returns the cached data (or null) synchronously-like via the returned promise.
 */
export async function cachedApiGet<T = any>(
    endpoint: string,
    onFresh: (data: T) => void,
    options: ApiOptions = {},
): Promise<T | null> {
    const accountScope = accountCacheScope();
    const requestToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const cacheKey = `api_cache:${accountScope}:${endpoint}`;
    const stillCurrentAccount = () => typeof window === "undefined" || (accountCacheScope() === accountScope && localStorage.getItem("token") === requestToken);
    let cached: T | null = null;

    if (typeof window !== "undefined") {
        try {
            const raw = sessionStorage.getItem(cacheKey);
            if (raw) cached = JSON.parse(raw);
        } catch { }
    }

    // Fire background fetch
    apiGet(endpoint, options)
        .then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                if (!stillCurrentAccount()) return;
                if (typeof window !== "undefined") {
                    try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch { }
                }
                onFresh(data);
            }
        })
        .catch(() => { });

    return cached;
}

/**
 * Centralized API fetch utility.
 * - Injects Authorization header from localStorage
 * - Handles common error codes (401 → login redirect, 403 → forbidden)
 * - Supports timeout via AbortController
 * - Supports exponential backoff retry
 */
export async function api(endpoint: string, options: ApiOptions = {}): Promise<Response> {
    const {
        skipAuth,
        timeout = 30000,
        retries = 0,
        onRetry,
        signal: externalSignal,
        ...fetchOptions
    } = options;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(fetchOptions.headers as Record<string, string> || {}),
    };

    const requestToken = !skipAuth && typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (requestToken) {
        headers["Authorization"] = `Bearer ${requestToken}`;
    }

    const maxAttempts = retries + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (externalSignal?.aborted) throw new DOMException("İstek iptal edildi.", "AbortError");
        if (!skipAuth && typeof window !== "undefined" && localStorage.getItem("token") !== requestToken) {
            throw new DOMException("Oturum değiştiği için istek iptal edildi.", "AbortError");
        }
        const controller = new AbortController();
        // Native composition also keeps caller cancellation connected while a
        // returned response body is being read. The listener supports older browsers.
        const requestSignal = externalSignal && typeof AbortSignal.any === "function"
            ? AbortSignal.any([controller.signal, externalSignal])
            : controller.signal;
        const onExternalAbort = () => controller.abort();
        externalSignal?.addEventListener("abort", onExternalAbort, { once: true });
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...fetchOptions,
                headers,
                signal: requestSignal,
                cache: 'no-store', // Ensure Next.js doesn't cache client API calls
            });

            clearTimeout(timeoutId);

            // Handle auth errors globally
            if (res.status === 401 && !skipAuth && typeof window !== "undefined" && localStorage.getItem("token") === requestToken) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/login";
                throw new Error("Oturum süresi doldu. Lütfen tekrar giriş yapın.");
            }

            // Handle rate limiting - auto-retry after delay
            if (res.status === 429) {
                const isLastAttempt = attempt >= maxAttempts;
                if (!isLastAttempt) {
                    const retryAfter = parseInt(res.headers.get('Retry-After') || '3', 10);
                    const delay = retryAfter * 1000;
                    console.warn(`Rate limited (429). Retrying after ${retryAfter}s (attempt ${attempt}/${maxAttempts})`);
                    onRetry?.(attempt, maxAttempts);
                    await sleep(delay, externalSignal);
                    continue;
                }
                console.error('Rate limited (429) - all retries exhausted');
            }

            return res;
        } catch (err: any) {
            clearTimeout(timeoutId);

            const isLastAttempt = attempt >= maxAttempts;
            const isAbort = err?.name === "AbortError";
            const isNetworkError = err?.name === "TypeError" || isAbort;

            if (externalSignal?.aborted || isLastAttempt || !isNetworkError) {
                throw err;
            }

            // Exponential backoff: 2s, 4s, 8s ...
            const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
            onRetry?.(attempt, maxAttempts);
            await sleep(delay, externalSignal);
        } finally {
            clearTimeout(timeoutId);
            externalSignal?.removeEventListener("abort", onExternalAbort);
        }
    }

    // Should never reach here, but TypeScript needs it
    throw new Error("Request failed after all retry attempts");
}

/**
 * Helper to make GET requests with retry support
 */
export async function apiGet(endpoint: string, options: ApiOptions = {}) {
    return api(endpoint, { retries: 2, ...options, method: "GET" });
}

/**
 * Helper to make POST requests with JSON body
 */
export async function apiPost(endpoint: string, body: unknown, options: ApiOptions = {}) {
    return api(endpoint, {
        ...options,
        method: "POST",
        body: JSON.stringify(body),
    });
}

/**
 * Helper to make DELETE requests
 */
export async function apiDelete(endpoint: string, options: ApiOptions = {}) {
    return api(endpoint, { ...options, method: "DELETE" });
}

/**
 * Helper to make PATCH requests with JSON body
 */
export async function apiPatch(endpoint: string, body: unknown, options: ApiOptions = {}) {
    return api(endpoint, {
        ...options,
        method: "PATCH",
        body: JSON.stringify(body),
    });
}
