"use client";

import { Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface ApiStatusProps {
    /** Current retry attempt number */
    retryAttempt?: number;
    /** Total max retry attempts */
    maxRetries?: number;
    /** Whether the API call has completely failed */
    failed?: boolean;
    /** Callback to manually retry */
    onRetry?: () => void;
    /** Custom message */
    message?: string;
}

/**
 * User-friendly cold-start / API waiting status indicator.
 * Shows a "server waking up" message with retry progress.
 */
export function ApiStatus({
    retryAttempt = 0,
    maxRetries = 3,
    failed = false,
    onRetry,
    message,
}: ApiStatusProps) {
    if (failed) {
        return (
            <div className="flex flex-col items-center gap-3 py-8 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                    <WifiOff className="h-6 w-6 text-amber-500" />
                </div>
                <p className="text-sm text-gray-600 text-center max-w-xs">
                    {message || "Sunucuya bağlanılamadı. Sunucu uyanıyor olabilir, lütfen biraz bekleyin."}
                </p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Tekrar Dene
                    </button>
                )}
            </div>
        );
    }

    if (retryAttempt > 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-8 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                    <Wifi className="h-6 w-6 text-blue-500 animate-pulse" />
                </div>
                <p className="text-sm text-gray-600 text-center">
                    Sunucu hazırlanıyor, otomatik tekrar deniyoruz...
                </p>
                {/* Progress bar */}
                <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${(retryAttempt / maxRetries) * 100}%` }}
                    />
                </div>
                <p className="text-xs text-gray-400">
                    Deneme {retryAttempt}/{maxRetries}
                </p>
            </div>
        );
    }

    return null;
}

/**
 * Skeleton card placeholder for packages section.
 */
export function PackageSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden flex flex-col animate-pulse">
            {/* Header skeleton */}
            <div className="bg-gradient-to-r from-gray-200 to-gray-300 px-5 py-4">
                <div className="h-4 bg-white/30 rounded w-3/4 mb-2" />
                <div className="h-6 bg-white/30 rounded w-1/2" />
            </div>
            {/* Subtitle skeleton */}
            <div className="px-5 pt-3 pb-1">
                <div className="h-7 bg-gray-100 rounded-md" />
            </div>
            {/* Features skeleton */}
            <div className="px-5 py-3 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-200 shrink-0" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-200 shrink-0" />
                    <div className="h-3 bg-gray-200 rounded w-4/5" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-200 shrink-0" />
                    <div className="h-3 bg-gray-200 rounded w-3/5" />
                </div>
            </div>
            {/* Button skeleton */}
            <div className="px-5 pb-5">
                <div className="h-10 bg-gray-200 rounded-lg" />
            </div>
        </div>
    );
}
