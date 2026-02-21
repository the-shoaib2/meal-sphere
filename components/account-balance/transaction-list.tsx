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
                        <div className="rounded-md border overflow-hidden">
                            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                        <TableRow>
                                            <TableHead className="min-w-[100px]">Amount</TableHead>
                                            <TableHead className="min-w-[100px]">Type</TableHead>
                                            <TableHead className="min-w-[150px] hidden sm:table-cell">Description</TableHead>
                                            <TableHead className="min-w-[120px] hidden md:table-cell">Added By</TableHead>
                                            <TableHead className="min-w-[140px]">Date</TableHead>
                                            {isAdmin && <TableHead className="text-right min-w-[80px]">Actions</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.map((t) => {
                                            const isEdited = new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime() > 1000;
                                            return (
                                                <TableRow key={t.id}>
                                                    <TableCell>
                                                        <span className={`font-medium ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {t.amount > 0 ? '+' : ''}৳{t.amount.toFixed(2)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-xs">{t.type}</Badge>
                                                    </TableCell>
                                                    <TableCell className="hidden sm:table-cell">
                                                        <div className="max-w-[200px] truncate text-sm text-muted-foreground" title={t.description || ''}>
                                                            {t.description}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        <div className="text-sm text-muted-foreground truncate max-w-[120px]" title={t.creator?.name || 'System'}>
                                                            {t.creator?.name || 'System'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap">
                                                        <div className="text-sm text-muted-foreground">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <span className="block sm:hidden">
                                                                            <SafeDate date={t.createdAt} format={(d) => d.toLocaleDateString('en-US')} />
                                                                        </span>
                                                                        <span className="hidden sm:block">
                                                                            <SafeDate date={t.createdAt} />
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Created: <SafeDate date={t.createdAt} /></p>
                                                                        {isEdited && <p>Updated: <SafeDate date={t.updatedAt} /></p>}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </TableCell>
                                                    {isAdmin && (
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0" suppressHydrationWarning>
                                                                        <span className="sr-only">Open menu</span>
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => onViewHistory(t.id)}>
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        <span>View History</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => onEdit(t)}>
                                                                        <Edit className="mr-2 h-4 w-4" />
                                                                        <span>Edit</span>
                                                                    </DropdownMenuItem>
                                                                    {isAdmin && (
                                                                        <DropdownMenuItem onClick={() => onDelete(t.id)} className="text-red-500 focus:text-red-500">
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
                                        {/* Loading Indicator / Intersection Sentinel */}
                                        {(hasNextPage || isFetchingNextPage) && (
                                            <TableRow>
                                                <TableCell colSpan={isAdmin ? 6 : 5} className="p-0 border-0">
                                                    <div ref={ref} className="flex justify-center p-4">
                                                        {isFetchingNextPage ? (
                                                            <Loader />
                                                        ) : (
                                                            <span className="h-4 w-full block" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
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
