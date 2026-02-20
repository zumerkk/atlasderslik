const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ApiOptions extends RequestInit {
    /** Skip automatic auth token injection */
    skipAuth?: boolean;
}

/**
 * Centralized API fetch utility.
 * - Injects Authorization header from localStorage
 * - Handles common error codes (401 → login redirect, 403 → forbidden)
 * - Provides consistent error handling
 */
export async function api(endpoint: string, options: ApiOptions = {}): Promise<Response> {
    const { skipAuth, ...fetchOptions } = options;

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

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
    });

    // Handle auth errors globally
    if (res.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
    }

    return res;
}

/**
 * Helper to make GET requests
 */
export async function apiGet(endpoint: string, options: ApiOptions = {}) {
    return api(endpoint, { ...options, method: "GET" });
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
