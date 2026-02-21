'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Info, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NoPeriodStateProps {
    title?: string;
    description?: string;
    isPrivileged?: boolean;
    periodMode?: 'MONTHLY' | 'CUSTOM';
    onCreatePeriod?: () => void;
    className?: string;
}

export function NoPeriodState({
    title = "No Active Period",
    description = "There is no active period for this group. A period is required to track meals, expenses, and payments.",
    isPrivileged = false,
    periodMode = 'MONTHLY',
    onCreatePeriod,
    className = "",
}: NoPeriodStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
            <div className="max-w-2xl w-full space-y-6">
                {/* Icon */}
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/20 to-orange-500/5 ring-8 ring-orange-500/10">
                    <Calendar className="h-10 w-10 text-orange-600" />
                </div>

                {/* Text Content */}
                <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
                    {/* Action Button */}
                    {isPrivileged && (
                        <div className="flex flex-col items-center gap-4 mt-2">
                            {onCreatePeriod ? (
                                <Button
                                    onClick={onCreatePeriod}

                                    className="w-full max-w-xs"
                                >
                                    <Plus className="h-5 w-5 mr-2" />
                                    Start New Period
                                </Button>
                            ) : (
                                <Button
                                    asChild

                                    className="px-4 rounded-full"
                                >
                                    <Link href="/periods?action=create">
                                        <Plus className="h-5 w-5 mr-2" />
                                        Start New Period
                                    </Link>
                                </Button>
                            )}
                            <p className="text-xs text-muted-foreground text-center mb-4">
                                As a group administrator, you can start a new period to begin tracking
                            </p>
                        </div>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground max-w-md mx-auto">
                        {description}
                    </p>
                </div>

                {/* Period Mode Info */}
                <Card className="border-2 border-dashed">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Info className="h-5 w-5 text-muted-foreground" />
                                <CardTitle className="text-base">Period Mode</CardTitle>
                            </div>
                            <Badge variant={periodMode === 'MONTHLY' ? 'default' : 'secondary'}>
                                {periodMode === 'MONTHLY' ? (
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Monthly
                                    </span>
                                ) : (
                                    'Custom'
                                )}
                            </Badge>
                        </div>
                        <CardDescription>
                            {periodMode === 'MONTHLY'
                                ? "Periods are automatically created at the start of each month"
                                : "Periods must be manually created by group administrators"
                            }
                        </CardDescription>
                    </CardHeader>
                </Card>



                {!isPrivileged && (
                    <div className="text-center mt-6">
                        <p className="text-sm text-muted-foreground">
                            Please contact a group administrator to start a new period
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
