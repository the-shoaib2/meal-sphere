"use client";

import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface InsufficientPermissionsStateProps {
    title?: string;
    description?: string;
    showBackButton?: boolean;
}

export function InsufficientPermissionsState({
    title = "Access Denied",
    description = "You don't have the required permissions to view this information. If you believe this is an error, please contact your room manager.",
    showBackButton = true
}: InsufficientPermissionsStateProps) {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-muted/20 rounded-xl border border-dashed border-muted-foreground/30 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                <ShieldAlert className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2 text-foreground">
                {title}
            </h2>
            <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
                {description}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
                {showBackButton && (
                    <Button
                        variant="outline"
                        onClick={() => router.back()}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </Button>
                )}
                <Button asChild className="flex items-center gap-2">
                    <Link href="/dashboard">
                        <Home className="w-4 h-4" />
                        Dashboard
                    </Link>
                </Button>
            </div>
        </div>
    );
}
