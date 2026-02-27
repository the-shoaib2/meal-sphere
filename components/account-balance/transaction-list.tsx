"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Edit, Trash2, MoreHorizontal, InfoIcon, Eye, X } from 'lucide-react';
import { type AccountTransaction } from '@/hooks/use-account-balance';
import { SafeDate } from '@/components/shared/safe-date';
import { LoadingWrapper, Loader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';

import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

interface TransactionListProps {
    transactions: AccountTransaction[];
    hasPrivilege: boolean;
    isAdmin: boolean;
    onEdit: (transaction: AccountTransaction) => void;
    onDelete: (transactionId: string) => void;
    onViewHistory: (transactionId: string | null) => void;
    isHistoryOpen?: boolean;
    onFetchNextPage?: () => void;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    isLoading?: boolean;
}

export function TransactionList({
    transactions,
    hasPrivilege,
    isAdmin,
    onEdit,
    onDelete,
    onViewHistory,
    isHistoryOpen = false,
    onFetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading = false
}: TransactionListProps) {
    const { ref, inView } = useInView({
        rootMargin: '200px',
    });

    useEffect(() => {
        if (inView && hasNextPage && onFetchNextPage) {
            onFetchNextPage();
        }
    }, [inView, hasNextPage, onFetchNextPage]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg sm:text-xl">Transaction Details</CardTitle>
                <div className="flex items-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={isHistoryOpen ? "default" : "outline"}
                                    size="icon"
                                    onClick={() => onViewHistory(isHistoryOpen ? null : "ALL")}
                                    className={`rounded-full h-8 w-8 ${isHistoryOpen ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    {isHistoryOpen ? <X className="h-4 w-4" /> : <InfoIcon className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{isHistoryOpen ? "Close History" : "View History"}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent>
                <LoadingWrapper isLoading={isLoading} minHeight="200px">
                    {transactions && transactions.length > 0 ? (
                        <div className="space-y-4">
                            {/* Desktop View - Table */}
                            <div className="hidden md:block rounded-md border border-border/50 overflow-hidden">
                                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-muted/50 z-10 shadow-sm">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="min-w-[120px] font-bold">Amount</TableHead>
                                                <TableHead className="min-w-[100px] font-bold">Type</TableHead>
                                                <TableHead className="min-w-[150px] hidden sm:table-cell font-bold">Description</TableHead>
                                                <TableHead className="min-w-[120px] hidden lg:table-cell font-bold">Added By</TableHead>
                                                <TableHead className="min-w-[140px] font-bold">Date</TableHead>
                                                {isAdmin && <TableHead className="text-right min-w-[80px] font-bold">Actions</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.map((t) => {
                                                const isEdited = new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime() > 1000;
                                                return (
                                                    <TableRow key={t.id} className="hover:bg-muted/20 transition-colors">
                                                        <TableCell className="font-bold">
                                                            <span className={t.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                                                {t.amount > 0 ? '+' : ''}৳{t.amount.toFixed(2)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[10px] uppercase font-bold tracking-wider bg-background/50"
                                                            >
                                                                {t.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell">
                                                            <div className="max-w-[200px] truncate text-sm text-muted-foreground font-medium" title={t.description || ''}>
                                                                {t.description || "No description"}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="hidden lg:table-cell">
                                                            <div className="text-sm text-muted-foreground truncate max-w-[120px] font-medium" title={t.creator?.name || 'System'}>
                                                                {t.creator?.name || 'System'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="whitespace-nowrap">
                                                            <div className="text-xs text-muted-foreground font-medium">
                                                                <SafeDate date={t.createdAt} />
                                                                {isEdited && <span className="ml-1 text-[10px] text-primary">(Edited)</span>}
                                                            </div>
                                                        </TableCell>
                                                        {isAdmin && (
                                                            <TableCell className="text-right">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted" suppressHydrationWarning>
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-44">
                                                                        <DropdownMenuItem onClick={() => onViewHistory(t.id)} className="font-medium">
                                                                            <Eye className="mr-2 h-4 w-4 text-primary" />
                                                                            <span>View History</span>
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => onEdit(t)} className="font-medium">
                                                                            <Edit className="mr-2 h-4 w-4 text-blue-600" />
                                                                            <span>Edit Entry</span>
                                                                        </DropdownMenuItem>
                                                                        {isAdmin && (
                                                                            <DropdownMenuItem onClick={() => onDelete(t.id)} className="text-red-600 focus:text-red-600 font-medium">
                                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                                <span>Delete</span>
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Mobile View - Polished Card List */}
                            <div className="md:hidden space-y-3">
                                {transactions.map((t) => {
                                    const isEdited = new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime() > 1000;
                                    return (
                                        <Card key={t.id} className="bg-card/50 shadow-sm border-border/50 overflow-hidden hover:border-primary/30 transition-colors">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] uppercase font-bold tracking-widest bg-background/50"
                                                    >
                                                        {t.type}
                                                    </Badge>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-muted-foreground font-medium">
                                                            <SafeDate date={t.createdAt} format={(d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
                                                        </span>
                                                        {isAdmin && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                        <MoreHorizontal className="h-3 w-3" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-40">
                                                                    <DropdownMenuItem onClick={() => onViewHistory(t.id)}>
                                                                        <Eye className="mr-2 h-4 w-4" /> View History
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => onEdit(t)}>
                                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => onDelete(t.id)} className="text-red-600 focus:text-red-600">
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-end justify-between">
                                                    <div className="min-w-0 pr-4">
                                                        <p className="text-xs font-bold text-foreground line-clamp-1">{t.description || "Credit/Debit entry"}</p>
                                                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                                            By: {t.creator?.name || 'System'} {isEdited && <span className="text-primary font-bold ml-1">(Edited)</span>}
                                                        </p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className={cn("text-sm font-bold tracking-tight", t.amount > 0 ? 'text-green-600' : 'text-red-600')}>
                                                            {t.amount > 0 ? '+' : ''}৳{t.amount.toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* Sentinel element for infinite scroll */}
                            {(hasNextPage || isFetchingNextPage) && (
                                <div ref={ref} className="flex justify-center p-4">
                                    {isFetchingNextPage ? (
                                        <Loader />
                                    ) : (
                                        <span className="h-4 w-full block" />
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="text-muted-foreground">No transactions found.</div>
                        </div>
                    )}
                </LoadingWrapper>
            </CardContent>
        </Card>
    );
}
