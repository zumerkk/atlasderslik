export type PackagePeriod = "monthly" | "yearly" | "one-time";
export type PackageGradePolicy = "fixed" | "student-level";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type FulfillmentStatus = "PENDING" | "PROCESSING" | "FULFILLED" | "FAILED" | "SKIPPED_SANDBOX";
export interface CommercePerson { _id: string; firstName: string; lastName: string; email?: string }
export interface CommerceMerchant { brand: string; title: string; taxNumber: string; taxOffice: string; address: string; email: string; phone: string; complete: boolean }
export interface CommercePackage {
    _id: string; name: string; description: string; subtitle?: string; price: number; originalPrice?: number;
    isActive: boolean; features?: string[]; badge?: string; sortOrder?: number; period: PackagePeriod; gradeIds?: string[];
    gradePolicy?: PackageGradePolicy;
}
export interface CommerceOrder {
    _id: string; amount: number; currency?: string; status: PaymentStatus; paymentEnvironment?: "live" | "sandbox";
    packageName?: string; packagePeriod?: PackagePeriod; package?: CommercePackage | null;
    user?: CommercePerson | string | null; beneficiary?: CommercePerson | string | null;
    createdAt?: string; paidAt?: string; validUntil?: string; fulfillmentAt?: string; cancelledAt?: string; checkoutExpiresAt?: string;
    fulfillmentStatus?: FulfillmentStatus; fulfillmentError?: string; failureCode?: string; iyzicoPaymentId?: string;
    gradeIds?: (string | { _id: string; label?: string; level?: number })[];
    canReconcile?: boolean; canCancel?: boolean; canResume?: boolean; checkoutExpired?: boolean;
    canRequestRefund?: boolean; refundRequestStatus?: "NONE" | "REQUESTED"; refundRequestedAt?: string; refundReason?: string;
    sellerSnapshot?: CommerceMerchant;
    providerVerifiedAt?: string; providerFraudStatus?: number;
}
export interface OrderPage {
    items: CommerceOrder[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
    summary: { totalOrders: number; completedOrders: number; pendingOrders: number; failedOrders: number; cancelledOrders: number; liveRevenue: number; sandboxRevenue: number; fulfillmentPending: number; refundRequests?: number };
    summaryScope: "matchingFilters";
}
export const PERIOD_LABELS: Record<PackagePeriod, string> = { monthly: "Aylık", yearly: "Yıllık", "one-time": "Tek seferlik" };
export const PAYMENT_LABELS: Record<PaymentStatus, string> = { PENDING: "Ödeme bekleniyor", COMPLETED: "Ödeme doğrulandı", FAILED: "Ödeme başarısız", CANCELLED: "Sipariş kapatıldı" };
export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = { PENDING: "Erişim hazırlanıyor", PROCESSING: "Sınıf kaydı işleniyor", FULFILLED: "Erişim açıldı", FAILED: "Sınıf kaydı kontrol edilmeli", SKIPPED_SANDBOX: "Test işlemi · erişim açılmaz" };

export function commerceMessage(value: unknown, fallback: string): string {
    if (!value || typeof value !== "object" || !("message" in value)) return fallback;
    const message = value.message;
    return typeof message === "string" && message ? message : Array.isArray(message) && message.every(item => typeof item === "string") ? message.join(" ") || fallback : fallback;
}
export async function commerceJson<T>(response: Response, fallback: string): Promise<T> {
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(commerceMessage(data, fallback));
    return data as T;
}
export function money(value: unknown): string {
    return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "—";
}
export function commerceDate(value?: string): string {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
}
export function personName(person: CommercePerson | string | null | undefined, fallback = "—"): string {
    return person && typeof person === "object" ? [person.firstName, person.lastName].filter(Boolean).join(" ") || fallback : fallback;
}
export function verifiedPayment(order: CommerceOrder): boolean {
    return order.status === "COMPLETED" && ["live", "sandbox"].includes(order.paymentEnvironment || "") && !!order.providerVerifiedAt && Number.isFinite(new Date(order.providerVerifiedAt).getTime()) && order.providerFraudStatus === 1;
}
export function validIdentityNumber(value: string): boolean {
    if (!/^[1-9]\d{10}$/.test(value)) return false;
    const digits = [...value].map(Number);
    const odd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const even = digits[1] + digits[3] + digits[5] + digits[7];
    return ((odd * 7 - even) % 10 + 10) % 10 === digits[9] && digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10 === digits[10];
}
export function normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, "");
    return digits.length === 10 ? `+90${digits}` : digits.length === 11 && digits.startsWith("0") ? `+9${digits}` : digits.length === 12 && digits.startsWith("90") ? `+${digits}` : value.trim();
}
export function hostedPaymentUrl(value: unknown): string | null {
    if (typeof value !== "string") return null;
    try {
        const url = new URL(value);
        return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") && ["iyzipay.com", "iyzico.com"].some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`)) ? url.toString() : null;
    } catch { return null; }
}
export function orderPage(value: OrderPage): OrderPage {
    if (!value || !Array.isArray(value.items) || !value.pagination || !Number.isInteger(value.pagination.total) || value.pagination.total < 0 || !Number.isInteger(value.pagination.page) || value.pagination.page < 1 || !Number.isInteger(value.pagination.totalPages) || value.pagination.totalPages < 0 || !Number.isInteger(value.pagination.pageSize) || value.pagination.pageSize < 1 || !value.summary || value.summaryScope !== "matchingFilters" || value.items.some(item => !item || typeof item._id !== "string" || !Object.hasOwn(PAYMENT_LABELS, item.status) || !Number.isFinite(item.amount) || item.amount < 0)) throw new Error("Sipariş listesi doğrulanamadı. Yeniden deneyin.");
    if ([value.summary.totalOrders, value.summary.completedOrders, value.summary.pendingOrders, value.summary.failedOrders, value.summary.cancelledOrders, value.summary.liveRevenue, value.summary.sandboxRevenue, value.summary.fulfillmentPending].some(item => !Number.isFinite(item) || item < 0)) throw new Error("Sipariş özeti doğrulanamadı. Yeniden deneyin.");
    return value;
}

export interface PackageGrade { _id: string; level: number; label: string; isActive: boolean }
export interface PackageDraft { name: string; description: string; subtitle: string; price: string; originalPrice: string; features: string; badge: string; sortOrder: string; period: PackagePeriod; isActive: boolean; gradeIds: string[]; gradePolicy?: PackageGradePolicy }
export function packagePayload(form: PackageDraft, grades: PackageGrade[]): Omit<CommercePackage, "_id"> {
    const priceText = form.price.replace(",", "."); const originalText = form.originalPrice.replace(",", ".");
    if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(priceText) || Number(priceText) <= 0 || Number(priceText) > 9999999.99) throw new Error("Fiyat 0'dan büyük, en fazla 9.999.999,99 TL ve iki ondalık haneli olmalıdır.");
    if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(originalText) || (Number(originalText) !== 0 && Number(originalText) <= Number(priceText))) throw new Error("Karşılaştırma fiyatı 0 veya satış fiyatından büyük olmalıdır; en fazla iki ondalık hane kullanın.");
    if (!/^\d+$/.test(form.sortOrder) || Number(form.sortOrder) > 10000) throw new Error("Sıralama 0 ile 10.000 arasında tam sayı olmalıdır.");
    const name = form.name.trim(), description = form.description.trim();
    if (name.length < 2 || name.length > 120) throw new Error("Paket adı 2–120 karakter olmalıdır.");
    if (description.length < 10 || description.length > 4000) throw new Error("Açıklama 10–4.000 karakter olmalıdır.");
    if (form.subtitle.trim().length > 180 || form.badge.trim().length > 50) throw new Error("Alt başlık en fazla 180, etiket en fazla 50 karakter olabilir.");
    const features = form.features.split("\n").map(value => value.trim()).filter(Boolean);
    if (features.length > 30 || features.some(value => value.length < 2 || value.length > 180)) throw new Error("En fazla 30 özellik ekleyin; her özellik 2–180 karakter olmalıdır.");
    if (new Set(features.map(value => value.toLocaleLowerCase("tr-TR"))).size !== features.length) throw new Error("Aynı özelliği birden fazla kez eklemeyin.");
    if (!Object.hasOwn(PERIOD_LABELS, form.period)) throw new Error("Geçerli bir paket dönemi seçin.");
    const selected = grades.filter(grade => form.gradeIds.includes(grade._id));
    const gradePolicy = form.gradePolicy || "fixed";
    if (!["fixed", "student-level"].includes(gradePolicy)) throw new Error("Geçerli bir sınıf kapsamı politikası seçin.");
    if (form.gradeIds.length > 20 || new Set(form.gradeIds).size !== form.gradeIds.length || selected.length !== form.gradeIds.length || selected.some(grade => !grade.isActive || !Number.isInteger(grade.level) || grade.level < 1 || grade.level > 12)) throw new Error("En fazla 20 geçerli, aktif sınıf seçin. Kaldırılmış veya pasif sınıfları seçimden çıkarın.");
    if (gradePolicy === "fixed" && new Set(selected.map(grade => grade.level)).size > 1) throw new Error("Sabit sınıf kapsamında yalnızca aynı seviyedeki şubeler bulunabilir.");
    if (gradePolicy === "student-level" && new Set(selected.map(grade => grade.level)).size !== selected.length) throw new Error("Öğrencinin seviyesine göre paketlerde her sınıf seviyesi için yalnızca bir şube seçin.");
    if (form.isActive && selected.some(grade => grade.level > 8)) throw new Error("Satışa açık paketler ilkokul ve ortaokul 1–8. sınıflarla sınırlıdır.");
    if (form.isActive && !selected.length) throw new Error("Paketi satışa açmak için en az bir aktif sınıf seçin.");
    return { name, description, subtitle: form.subtitle.trim(), price: Number(priceText), originalPrice: Number(originalText), features, badge: form.badge.trim(), sortOrder: Number(form.sortOrder), period: form.period, isActive: form.isActive, gradeIds: form.gradeIds, gradePolicy };
}
