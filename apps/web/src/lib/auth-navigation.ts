const ID = /^[a-f0-9]{24}$/i;
const ROLE_HOME: Record<string, string> = { ADMIN: "/admin", SUPERADMIN: "/admin", TEACHER: "/teacher", STUDENT: "/student", PARENT: "/parent" };

export function accountHome(role?: string): string { return ROLE_HOME[role || ""] || "/"; }
export function accountOrders(role?: string): string | null {
    return role === "ADMIN" || role === "SUPERADMIN" ? "/admin/orders" : role === "PARENT" ? "/parent/packages" : role === "STUDENT" ? "/student/packages" : null;
}
export function cartHref(packageId?: string, studentId?: string): string {
    const query = new URLSearchParams();
    if (packageId && ID.test(packageId)) query.set("packageId", packageId);
    if (studentId && ID.test(studentId)) query.set("studentId", studentId);
    return `/cart${query.size ? `?${query}` : ""}`;
}
/** Only known local destinations survive authentication; prices and arbitrary URLs never do. */
export function safeAuthRedirect(value: unknown, role?: string): string | null {
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value) || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) return null;
    try {
        const url = new URL(value, "https://atlas.internal");
        if (url.origin !== "https://atlas.internal" || url.username || url.password || url.hash) return null;
        if (url.pathname === "/cart" || url.pathname === "/payment") {
            const packageId = url.searchParams.get("packageId") || undefined;
            const studentId = url.searchParams.get("studentId") || undefined;
            if ((packageId && !ID.test(packageId)) || (studentId && !ID.test(studentId))) return null;
            return cartHref(packageId, studentId);
        }
        if (url.pathname === "/payment/result") {
            const id = url.searchParams.get("orderId");
            return id && ID.test(id) ? `/payment/result?orderId=${id}` : "/payment/result";
        }
        if (url.pathname === "/packages" || /^\/packages\/[a-f0-9]{24}$/i.test(url.pathname) || url.pathname === "/account/security") return url.pathname;
        const homes = role ? [accountHome(role)] : Object.values(ROLE_HOME);
        return homes.some(home => home !== "/" && (url.pathname === home || url.pathname.startsWith(`${home}/`))) ? url.pathname : null;
    } catch { return null; }
}
export function authPageHref(page: "login" | "register", intent?: unknown): string {
    const redirect = safeAuthRedirect(intent);
    return `/${page}${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`;
}
export function afterAuthentication(role: string, intent?: unknown): string {
    return safeAuthRedirect(intent, role) || accountHome(role);
}
