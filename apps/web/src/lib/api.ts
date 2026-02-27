const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ApiOptions extends RequestInit {
    /** Skip automatic auth token injection */
    skipAuth?: boolean;
    /** Timeout in milliseconds (default: 10000) */
    timeout?: number;
    /** Number of retry attempts (default: 0 = no retry) */
    retries?: number;
    /** Callback on each retry attempt */
    onRetry?: (attempt: number, maxAttempts: number) => void;
}

/**
 * Sleep helper for exponential backoff
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    const cacheKey = `api_cache:${endpoint}`;
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
        timeout = 10000,
        retries = 0,
        onRetry,
        ...fetchOptions
    } = options;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(fetchOptions.headers as Record<string, string> || {}),
    };

    if (!skipAuth && typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
    }

    const maxAttempts = retries + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...fetchOptions,
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Handle auth errors globally
            if (res.status === 401 && typeof window !== "undefined") {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/login";
            }

            return res;
        } catch (err: any) {
            clearTimeout(timeoutId);

            const isLastAttempt = attempt >= maxAttempts;
            const isAbort = err?.name === "AbortError";
            const isNetworkError = err?.name === "TypeError" || isAbort;

            if (isLastAttempt || !isNetworkError) {
                throw err;
            }

            // Exponential backoff: 2s, 4s, 8s ...
            const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
            onRetry?.(attempt, maxAttempts);
            await sleep(delay);
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
