"use client";


import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import React from "react";

interface QuickActionCardProps {
    icon: React.ReactNode;
    color: string;
    title: string;
    desc: string;
    onClick?: () => void; // Added optional onClick for future interactivity
    isLoading?: boolean;
}

export function QuickActionCard({ icon, color, title, desc, onClick, isLoading }: QuickActionCardProps) {
    const colorClasses: Record<string, { bg: string, icon: string, hover: string, border: string }> = {
        green: {
            bg: "bg-card/50 hover:bg-emerald-500/5",
            border: "border-border/50 hover:border-emerald-500/20",
            icon: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
            hover: "hover:shadow-emerald-500/5 dark:hover:shadow-emerald-500/10"
        },
        blue: {
            bg: "bg-card/50 hover:bg-blue-500/5",
            border: "border-border/50 hover:border-blue-500/20",
            icon: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
            hover: "hover:shadow-blue-500/5 dark:hover:shadow-blue-500/10"
        },
        purple: {
            bg: "bg-card/50 hover:bg-purple-500/5",
            border: "border-border/50 hover:border-purple-500/20",
            icon: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
            hover: "hover:shadow-purple-500/5 dark:hover:shadow-purple-500/10"
        },
        orange: {
            bg: "bg-card/50 hover:bg-orange-500/5",
            border: "border-border/50 hover:border-orange-500/20",
            icon: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
            hover: "hover:shadow-orange-500/5 dark:hover:shadow-orange-500/10"
        },
    };

    const style = colorClasses[color] || colorClasses.blue;

    return (
        <Card
            className={`group relative overflow-hidden backdrop-blur-sm transition-all duration-300 cursor-pointer rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] border ${style.bg} ${style.border} ${style.hover}`}
            onClick={isLoading ? undefined : onClick}
        >
            <CardContent className="p-4 sm:p-5">
                <div className="flex flex-row items-center gap-3 sm:gap-4">
                    <div className={`p-2.5 sm:p-3 rounded-xl transition-all duration-300 group-hover:scale-110 ${style.icon}`}>
                        {icon}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <h3 className="font-semibold text-sm sm:text-base tracking-tight text-foreground">{title}</h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground font-medium line-clamp-1">{desc}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
