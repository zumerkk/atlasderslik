export const AUTH_CHANGED_EVENT = "atlas:auth-changed";
export interface AuthSession { access_token: string; user: { id?: string; _id?: string; role: string; firstName?: string; lastName?: string; email?: string; [key: string]: unknown } }

export function saveAuthSession(value: unknown): AuthSession {
    if (!value || typeof value !== "object") throw new Error("Oturum yanıtı doğrulanamadı.");
    const data = value as Partial<AuthSession>;
    if (typeof data.access_token !== "string" || !data.access_token || !data.user || !(data.user.id || data.user._id) || !["STUDENT", "PARENT", "TEACHER", "ADMIN", "SUPERADMIN"].includes(data.user.role)) throw new Error("Oturum yanıtı doğrulanamadı. Yeniden giriş yapın.");
    localStorage.removeItem("token");
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.access_token);
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
    return data as AuthSession;
}
export function clearAuthSession(): void {
    localStorage.removeItem("token"); localStorage.removeItem("user");
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
