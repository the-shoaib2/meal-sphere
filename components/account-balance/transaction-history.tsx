import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface TransactionHistoryProps {
    transactionId: string | null;
    userId?: string;
    roomId?: string;
    periodId?: string;
    onBack: () => void;
    initialData?: HistoryRecord[];
}

export function TransactionHistory({ transactionId, userId, roomId, periodId, onBack, initialData }: TransactionHistoryProps) {
    const isGlobal = transactionId === "ALL";

    const { data: history, isLoading, error } = useGetAccountHistory(
        roomId || '',
        userId || '',
        periodId,
        { groupId: roomId, history: initialData } as any
    );

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

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg sm:text-xl">
                    {transactionId === "ALL" ? "Global Audit Log" : "Transaction History"}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        <div className="overflow-x-auto">
                            <div className="min-w-[600px]">
                                <Skeleton className="h-12 w-full mb-2" />
                                <Skeleton className="h-12 w-full mb-2" />
                                <Skeleton className="h-12 w-full mb-2" />
                            </div>
                        </div>
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
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${record.action === 'CREATE' || record.action === 'ADD' ? 'bg-green-100 text-green-700' :
                                                    record.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
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
