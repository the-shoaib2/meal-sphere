"use client";

import { Card, CardContent } from "@/components/ui/card";
import React from "react";

interface QuickActionCardProps {
    icon: React.ReactNode;
    color: string;
    title: string;
    desc: string;
    onClick?: () => void; // Added optional onClick for future interactivity
}

export function QuickActionCard({ icon, color, title, desc, onClick }: QuickActionCardProps) {
    const colorClasses: Record<string, string> = {
        green: "bg-green-100 text-green-600 group-hover:bg-green-200",
        blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-200",
        purple: "bg-purple-100 text-purple-600 group-hover:bg-purple-200",
        orange: "bg-orange-100 text-orange-600 group-hover:bg-orange-200",
    };

    return (
        <Card
            className="group hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={onClick}
        >
            <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`p-1.5 sm:p-2 rounded-full transition-colors ${colorClasses[color]}`}>
                        {icon}
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">{desc}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
