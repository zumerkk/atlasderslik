const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ApiOptions extends RequestInit {
    /** Skip automatic auth token injection */
    skipAuth?: boolean;
    /** Timeout in milliseconds (default: 15000) */
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
 * Centralized API fetch utility.
 * - Injects Authorization header from localStorage
 * - Handles common error codes (401 → login redirect, 403 → forbidden)
 * - Supports timeout via AbortController
 * - Supports exponential backoff retry
 */
export async function api(endpoint: string, options: ApiOptions = {}): Promise<Response> {
    const {
        skipAuth,
        timeout = 15000,
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
