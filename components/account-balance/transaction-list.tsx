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
import { Edit, Trash2, MoreHorizontal, Eye } from 'lucide-react';
import { type AccountTransaction } from '@/hooks/use-account-balance';

interface TransactionListProps {
    transactions: AccountTransaction[];
    hasPrivilege: boolean;
    isAdmin: boolean;
    onEdit: (transaction: AccountTransaction) => void;
    onDelete: (transactionId: string) => void;
    onViewHistory: (transactionId: string) => void;
}

export function TransactionList({
    transactions,
    hasPrivilege,
    isAdmin,
    onEdit,
    onDelete,
    onViewHistory
}: TransactionListProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg sm:text-xl">Transaction Details</CardTitle>
                <Button variant="outline" size="sm" onClick={() => onViewHistory("")} className="text-muted-foreground hover:text-foreground">
                    <Eye className="mr-2 h-4 w-4" />
                    View History
                </Button>
            </CardHeader>
            <CardContent>
                {transactions && transactions.length > 0 ? (
                    <div className="rounded-md border overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[100px]">Amount</TableHead>
                                        <TableHead className="min-w-[100px]">Type</TableHead>
                                        <TableHead className="min-w-[150px] hidden sm:table-cell">Description</TableHead>
                                        <TableHead className="min-w-[120px] hidden md:table-cell">Added By</TableHead>
                                        <TableHead className="min-w-[140px]">Date</TableHead>
                                        {hasPrivilege && <TableHead className="text-right min-w-[80px]">Actions</TableHead>}
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
                                                <TableCell>
                                                    <div className="text-sm text-muted-foreground">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <span className="block sm:hidden">{new Date(t.createdAt).toLocaleDateString()}</span>
                                                                    <span className="hidden sm:block">{new Date(t.createdAt).toLocaleString()}</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Created: {new Date(t.createdAt).toLocaleString()}</p>
                                                                    {isEdited && <p>Updated: {new Date(t.updatedAt).toLocaleString()}</p>}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                                {hasPrivilege && (
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                    <span className="sr-only">Open menu</span>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                {/* ADMIN and ACCOUNTANT can edit transactions */}
                                                                <DropdownMenuItem onClick={() => onEdit(t)}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    <span>Edit</span>
                                                                </DropdownMenuItem>
                                                                {/* Only ADMIN can delete transactions */}
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
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-muted-foreground">No transactions found.</div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
