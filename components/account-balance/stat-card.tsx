"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    icon: LucideIcon;
    title: string;
    value: string | number;
    isCurrency?: boolean;
    isPositive?: boolean;
    className?: string;
}

export const StatCard = ({
    icon: Icon,
    title,
    value,
    isCurrency = false,
    isPositive,
    className
}: StatCardProps) => (
    <Card className={cn("bg-card/50 shadow-sm border-border/50", className)}>
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 text-center sm:text-left">
            <div className="p-2 sm:p-2.5 bg-primary/5 rounded-xl mb-1 sm:mb-0">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider mb-0.5">{title}</p>
                <p className={cn(
                    "text-base sm:text-xl font-bold truncate tracking-tight",
                    isCurrency && isPositive !== undefined ? (isPositive ? 'text-green-600' : 'text-red-600') : 'text-foreground'
                )}>
                    {value}
                </p>
            </div>
        </CardContent>
    </Card>
);
