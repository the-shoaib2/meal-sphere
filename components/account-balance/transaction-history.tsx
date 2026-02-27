import React, { useEffect } from 'react';
import { CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetAccountHistory, type HistoryRecord } from '@/hooks/use-account-balance';
import { InsufficientPermissionsState } from '@/components/empty-states/insufficient-permissions-state';
import { useInView } from 'react-intersection-observer';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface TransactionHistoryProps {
    transactionId: string | null;
    userId?: string;
    roomId?: string;
    periodId?: string;
    onBack?: () => void;
    initialData?: HistoryRecord[] | { pages: { items: HistoryRecord[], nextCursor?: string }[] };
}

export function TransactionHistory({ transactionId, userId, roomId, periodId, onBack, initialData }: TransactionHistoryProps) {
    const { ref, inView } = useInView({
        rootMargin: '200px',
    });

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        error
    } = useGetAccountHistory(
        roomId || '',
        userId || '',
        periodId,
        initialData
    );

    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, fetchNextPage, hasNextPage]);

    const isForbidden = (error as any)?.message?.includes('403');

    if (isForbidden) {
        return (
            <InsufficientPermissionsState
                title="History Access Restricted"
                description="You don't have permission to view the transaction audit log for this account."
                showBackButton={false}
            />
        );
    }

    const historyItems = data?.pages.flatMap((page: any) => page.items || page) || [];

    return (
        <CardContent className="p-0 sm:p-0">
            {isLoading ? (
                <div className="space-y-3 p-4">
                    <div className="overflow-x-auto">
                        <div className="min-w-[600px] hidden md:block">
                            <Skeleton className="h-12 w-full mb-2" />
                            <Skeleton className="h-12 w-full mb-2" />
                        </div>
                        <div className="md:hidden space-y-4">
                            <Skeleton className="h-24 w-full rounded-lg" />
                            <Skeleton className="h-24 w-full rounded-lg" />
                        </div>
                    </div>
                </div>
            ) : historyItems.length > 0 ? (
                <div className="space-y-4">
                    {/* Desktop View - Table */}
                    <div className="hidden md:block rounded-md border-x border-t overflow-hidden">
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm border-b">
                                    <TableRow>
                                        <TableHead className="w-[180px]">Date/Time</TableHead>
                                        <TableHead className="w-[100px]">Action</TableHead>
                                        <TableHead>Changed By</TableHead>
                                        <TableHead>Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyItems.map((record: HistoryRecord) => (
                                        <TableRow key={record.id} className="hover:bg-muted/30 transition-colors border-b">
                                            <TableCell className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                                {new Date(record.changedAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider",
                                                        record.action === 'CREATE' || record.action === 'ADD' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            record.action === 'UPDATE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                record.action === 'DELETE' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                    'bg-gray-50 text-gray-700 border-gray-200'
                                                    )}
                                                >
                                                    {record.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6 ring-1 ring-border">
                                                        <AvatarImage src={record.changedByUser.image || ''} />
                                                        <AvatarFallback>{record.changedByUser.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm font-semibold truncate max-w-[120px]">
                                                        {record.changedByUser.name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="text-xs font-bold flex items-center gap-2">
                                                        <span className="text-muted-foreground font-medium">{record.type}:</span>
                                                        <span className="text-foreground">৳{record.amount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground italic truncate max-w-[200px]" title={record.description || ''}>
                                                        {record.description || 'No description'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Mobile View - Cards */}
                    <div className="md:hidden space-y-3 p-3 pt-0">
                        {historyItems.map((record: HistoryRecord) => (
                            <div key={record.id} className="bg-card shadow-none border border-border/50 rounded-lg hover:border-primary/50 transition-colors overflow-hidden">
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[9px] font-bold px-1.5 py-0 uppercase tracking-tighter",
                                                record.action === 'CREATE' || record.action === 'ADD' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    record.action === 'UPDATE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        record.action === 'DELETE' ? 'bg-red-50 text-red-700 border-red-200' :
                                                            'bg-gray-50 text-gray-700 border-gray-200'
                                            )}
                                        >
                                            {record.action}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                            {new Date(record.changedAt).toLocaleDateString()} {new Date(record.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5">
                                            <AvatarImage src={record.changedByUser.image || ''} />
                                            <AvatarFallback>{record.changedByUser.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-bold text-foreground">
                                            {record.changedByUser.name}
                                        </span>
                                    </div>

                                    <div className="bg-muted/10 rounded-md p-2 space-y-1.5 border border-border/30">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground font-medium">{record.type}</span>
                                            <span className="font-bold text-foreground">৳{record.amount.toFixed(2)}</span>
                                        </div>
                                        {record.description && (
                                            <p className="text-[10px] text-muted-foreground italic line-clamp-2 leading-relaxed">
                                                "{record.description}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Infinite Scroll Sentinel */}
                    <div ref={ref} className="py-4 flex justify-center w-full">
                        {(isFetchingNextPage || hasNextPage) ? (
                            <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
                        ) : (
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">End of Log</span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    No history found for this transaction.
                </div>
            )}
        </CardContent>
    );
}
