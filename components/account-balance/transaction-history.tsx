import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface TransactionHistoryProps {
    transactionId: string | null;
    onBack: () => void;
}

interface HistoryRecord {
    id: string;
    action: string;
    amount: number;
    type: string;
    description: string | null;
    changedAt: string;
    changedByUser: {
        id: string;
        name: string | null;
        image: string | null;
        email: string | null;
    };
}

export function TransactionHistory({ transactionId, onBack }: TransactionHistoryProps) {
    const { data: history, isLoading } = useQuery<HistoryRecord[]>({
        queryKey: ['transaction-history', transactionId],
        queryFn: async () => {
            if (!transactionId) return [];
            const res = await fetch(`/api/account-balance/transactions/${transactionId}/history`);
            if (!res.ok) throw new Error('Failed to fetch history');
            return res.json();
        },
        enabled: !!transactionId,
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg sm:text-xl">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : history && history.length > 0 ? (
                    <div className="rounded-md border overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Previous State</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {new Date(record.changedAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${record.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                                    record.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {record.action}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={record.changedByUser.image || ''} />
                                                        <AvatarFallback>{record.changedByUser.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm truncate max-w-[100px]" title={record.changedByUser.name || ''}>
                                                        {record.changedByUser.name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div>
                                                    <span className="font-semibold">{record.type}</span>: ৳{record.amount}
                                                </div>
                                                <div className="text-muted-foreground truncate max-w-[150px]" title={record.description || ''}>
                                                    {record.description}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        No history found for this transaction.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
