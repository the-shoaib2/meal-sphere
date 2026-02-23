"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { clearLocalStorage } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface SignOutDialogProps {
    variant?: "sidebar" | "avatar";
    className?: string;
}

export function SignOutDialog({ variant = "avatar", className }: SignOutDialogProps) {
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleSignOut = async () => {
        setIsSigningOut(true);
        try {
            clearLocalStorage();
            await signOut({ callbackUrl: "/", redirect: true });
        } catch (error) {
            console.error("Sign out error:", error);
            window.location.href = "/";
        } finally {
            setIsSigningOut(false);
            setIsOpen(false);
        }
    };

    if (variant === "sidebar") {
        return (
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogTrigger asChild>
                    <button
                        disabled={isSigningOut}
                        suppressHydrationWarning
                        className={cn(
                            "w-full flex items-center px-3 py-2 text-sm rounded-sm transition-colors group cursor-pointer hover:bg-red-500/10",
                            isSigningOut && "opacity-50 cursor-not-allowed",
                            className
                        )}
                    >
                        {isSigningOut ? (
                            <Loader2 className="mr-3 h-4 w-4 animate-spin" />
                        ) : (
                            <LogOut className="mr-3 h-4 w-4 text-red-500 transition-colors group-hover:text-red-600" />
                        )}
                        <span className="font-medium text-red-500 group-hover:text-red-600">
                            {isSigningOut ? "Signing out..." : "Sign out"}
                        </span>
                    </button>
                </AlertDialogTrigger>
                <SignOutAlertContent isSigningOut={isSigningOut} onConfirm={handleSignOut} />
            </AlertDialog>
        );
    }

    // Default: Avatar dropdown variant
    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <div
                    className={cn(
                        "flex w-full items-center px-2.5 py-2 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors outline-none group",
                        isSigningOut && "opacity-50 pointer-events-none",
                        className
                    )}
                >
                    {isSigningOut ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2.5" />
                    ) : (
                        <LogOut className="h-4 w-4 mr-2.5 text-red-500 group-hover:text-red-600 transition-colors" />
                    )}
                    <span className="font-medium cursor-pointer text-red-500 group-hover:text-red-600 transition-colors flex-1 text-left">
                        Sign out
                    </span>
                </div>
            </AlertDialogTrigger>
            <SignOutAlertContent isSigningOut={isSigningOut} onConfirm={handleSignOut} />
        </AlertDialog>
    );
}

function SignOutAlertContent({
    isSigningOut,
    onConfirm,
}: {
    isSigningOut: boolean;
    onConfirm: () => void;
}) {
    return (
        <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-red-600">Sign out?</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to sign out?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isSigningOut}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={(e) => {
                        e.preventDefault();
                        onConfirm();
                    }}
                    disabled={isSigningOut}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                    {isSigningOut ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing out...
                        </>
                    ) : (
                        <>
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign out
                        </>
                    )}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    );
}
