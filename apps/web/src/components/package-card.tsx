"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Check } from "lucide-react";

interface PackageCardProps {
    id: string;
    name: string;
    description: string;
    price: number;
    features?: string[];
    onPurchase: (id: string) => void;
}

export function PackageCard({
    id,
    name,
    description,
    price,
    features = [],
    onPurchase
}: PackageCardProps) {
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>{name}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-bold mb-4">{price} TL</div>
                <ul className="space-y-2">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-muted-foreground">
                            <Check className="mr-2 h-4 w-4 text-green-500" />
                            {feature}
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={() => onPurchase(id)}>
                    Satın Al
                </Button>
            </CardFooter>
        </Card>
    );
}
