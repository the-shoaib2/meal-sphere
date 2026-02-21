'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface GroupSuggestionCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionText: string;
    actionHref: string;
    variant?: 'default' | 'outline';
    className?: string;
}

export function GroupSuggestionCard({
    icon: Icon,
    title,
    description,
    actionText,
    actionHref,
    variant = 'default',
    className = "",
}: GroupSuggestionCardProps) {
    return (
        <Card className={`group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50 ${className}`}>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                </div>
                <CardDescription className="mt-2">
                    {description}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button
                    asChild
                    variant={variant}
                    className="w-full"

                >
                    <Link href={actionHref}>
                        {actionText}
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
