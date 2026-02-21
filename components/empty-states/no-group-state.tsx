'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NoGroupStateProps {
    title?: string;
    description?: string;
    showActions?: boolean;
    className?: string;
}

export function NoGroupState({
    title = "No Groups Yet",
    description = "You haven't joined any groups yet. Create a new group or browse public groups to get started with meal planning.",
    showActions = true,
    className = "",
}: NoGroupStateProps) {
    const router = useRouter();

    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
            <div className="max-w-2xl w-full space-y-6">
                {/* Icon */}
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-8 ring-primary/10">
                    <Users className="h-10 w-10 text-primary" />
                </div>

                {/* Text Content */}
                <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        {description}
                    </p>
                </div>

                {/* Action Cards */}
                {showActions && (
                    <div className="grid gap-4 md:grid-cols-2 mt-8">
                        <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50 cursor-pointer">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                        <Plus className="h-5 w-5 text-primary" />
                                    </div>
                                    <CardTitle className="text-lg">Create Group</CardTitle>
                                </div>
                                <CardDescription>
                                    Start your own meal planning group and invite others to join
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    asChild
                                    className="w-full group/button"
                                    size="sm"
                                >
                                    <Link href="/groups/create" className="flex items-center justify-center gap-2">
                                        Create New Group
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover/button:translate-x-1" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50 cursor-pointer">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                        <Search className="h-5 w-5 text-primary" />
                                    </div>
                                    <CardTitle className="text-lg">Browse Groups</CardTitle>
                                </div>
                                <CardDescription>
                                    Discover and join existing public groups in your area
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full group/button"
                                    size="sm"
                                >
                                    <Link href="/groups?tab=discover" className="flex items-center justify-center gap-2">
                                        Explore Public Groups
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover/button:translate-x-1" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {showActions && (
                    <div className="flex justify-center mt-4">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/periods" className="text-muted-foreground hover:text-primary flex items-center gap-1">
                                <Search className="h-4 w-4" />
                                View Period Management
                            </Link>
                        </Button>
                    </div>
                )}

                {/* Additional Help Text */}
                <div className="text-center mt-6">
                    <p className="text-sm text-muted-foreground">
                        Need help getting started?{" "}
                        <Link href="/about" className="text-primary hover:underline font-medium">
                            Learn more about groups
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
