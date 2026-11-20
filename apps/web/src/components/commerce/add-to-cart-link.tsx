"use client";

import Link from "next/link";
import { useCommerceAccount } from "./use-commerce-account";
import { authPageHref, cartHref } from "@/lib/auth-navigation";
import { Button } from "@/components/ui/button";

export function AddToCartLink({ packageId, className, children }: { packageId: string; className?: string; children: React.ReactNode }) {
    const { account } = useCommerceAccount();
    const cart = cartHref(packageId);
    return <Button asChild className={className}><Link href={account ? cart : authPageHref("login", cart)}>{children}</Link></Button>;
}
