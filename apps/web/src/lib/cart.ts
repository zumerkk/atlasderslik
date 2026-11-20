import { PERIOD_LABELS, type CommerceMerchant, type CommercePerson, type PackagePeriod } from "./commerce";

export interface CartStudent extends CommercePerson { grade?: number }
export interface CartPackage { _id: string; name: string; description?: string; price?: number; period?: PackagePeriod; features?: string[] }
export interface CustomerCart {
    id: string; revision: number;
    item: { package: CartPackage; student: CartStudent | null } | null;
    quote: { amount: number; currency: "TRY"; period: PackagePeriod } | null;
    students: CartStudent[];
    quoteChanged: boolean; canPurchase: boolean; canCheckout: boolean; reason: string | null;
    paymentReadiness: { mode: "live" | "sandbox" | "unconfigured"; canAcceptPayments: boolean; message: string };
    merchant: CommerceMerchant;
    legalVersions: { terms: string; privacy: string; salesAgreement: string; preInformation: string };
    orderId?: string;
}
export function verifiedCart(cart: CustomerCart): CustomerCart {
    if (!cart || typeof cart.id !== "string" || !Number.isSafeInteger(cart.revision) || cart.revision < 0 || !Array.isArray(cart.students) || !cart.paymentReadiness || typeof cart.paymentReadiness.canAcceptPayments !== "boolean" || typeof cart.canCheckout !== "boolean" || typeof cart.canPurchase !== "boolean" || typeof cart.quoteChanged !== "boolean" || !cart.legalVersions) throw new Error("Sepet bilgileri doğrulanamadı. Yeniden yükleyin.");
    if (cart.item && (!cart.item.package || typeof cart.item.package._id !== "string" || typeof cart.item.package.name !== "string")) throw new Error("Sepetteki paket doğrulanamadı.");
    if (cart.quote && (!Number.isFinite(cart.quote.amount) || cart.quote.amount < 0 || cart.quote.currency !== "TRY" || !Object.hasOwn(PERIOD_LABELS, cart.quote.period))) throw new Error("Sepet tutarı doğrulanamadı.");
    if (cart.canCheckout && (!cart.item?.student || !cart.quote || cart.quote.amount <= 0 || cart.quoteChanged || !cart.canPurchase || !cart.paymentReadiness.canAcceptPayments)) throw new Error("Ödeme uygunluğu doğrulanamadı. Sepeti yenileyin.");
    return cart;
}
