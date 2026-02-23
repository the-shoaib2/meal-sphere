"use client";

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader } from '@/components/ui/loader';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, User, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'react-hot-toast';
import {
    useAddTransaction,
    useUpdateTransaction,
    useGroupBalances,
    type AccountTransaction,
    type MemberWithBalance
} from '@/hooks/use-account-balance';

interface AccountTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groupId: string;
    targetUserId?: string;
    transaction?: AccountTransaction | null;
    targetUser?: { name: string; image?: string | null; email?: string | null };
    onSuccess?: () => void;
    onOptimisticUpdate?: (action: { type: 'add' | 'update' | 'delete', transaction: any }) => void;
}

export function AccountTransactionDialog({
    open,
    onOpenChange,
    groupId,
    targetUserId: initialTargetUserId,
    transaction,
    targetUser,
    onSuccess,
    onOptimisticUpdate
}: AccountTransactionDialogProps) {
    const [amount, setAmount] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [type, setType] = React.useState('ADJUSTMENT');
    const [targetUserId, setTargetUserId] = React.useState(initialTargetUserId || '');
    const [isMemberPopoverOpen, setIsMemberPopoverOpen] = React.useState(false);

    // Fetch members internally only when dialog is open and no specific target User is provided
    const { data: groupData, isLoading: isLoadingMembers } = useGroupBalances(groupId, open && !initialTargetUserId, false);
    const members = groupData?.members || [];

    const addTransactionMutation = useAddTransaction();
    const updateTransactionMutation = useUpdateTransaction();

    // Reset state when dialog opens/closes or transaction changes
    React.useEffect(() => {
        if (open) {
            if (transaction) {
                setAmount(String(transaction.amount));
                setDescription(transaction.description || '');
                setType(transaction.type);
                setTargetUserId(transaction.targetUserId);
            } else {
                setAmount('');
                setDescription('');
                setType('PAYMENT');
                setTargetUserId(initialTargetUserId || '');
            }
        }
    }, [open, transaction, initialTargetUserId]);

    const handleSubmit = async () => {
        try {
            if (!groupId) return;

            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                toast.error('Please enter a valid amount');
                return;
            }

            if (!targetUserId) {
                toast.error('Please select a member');
                return;
            }

            let finalDescription = description.trim();
            if (!finalDescription) {
                const typeLabel = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
                const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'BDT' }).format(parsedAmount);
                finalDescription = `${typeLabel} of ${formattedAmount}`;
            }

            if (transaction) {
                if (onOptimisticUpdate) {
                    onOptimisticUpdate({
                        type: 'update',
                        transaction: { ...transaction, amount: parsedAmount, description: finalDescription, type: type }
                    });
                }
                await updateTransactionMutation.mutateAsync({
                    id: transaction.id,
                    amount: parsedAmount,
                    description: finalDescription,
                    type: type,
                });
                toast.success('Transaction updated successfully');
            } else {
                if (onOptimisticUpdate) {
                    onOptimisticUpdate({
                        type: 'add',
                        transaction: {
                            id: `temp-${Date.now()}`,
                            amount: parsedAmount,
                            description: finalDescription,
                            type: type,
                            targetUserId: targetUserId,
                            createdAt: new Date().toISOString(),
                            user: targetUser || { name: 'New Transaction' }
                        }
                    });
                }
                await addTransactionMutation.mutateAsync({
                    targetUserId: targetUserId,
                    roomId: groupId,
                    amount: parsedAmount,
                    description: finalDescription,
                    type: type
                });
                toast.success('Transaction added successfully');
            }

            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (e: any) {
            toast.error(e.message || 'Failed to process transaction');
        }
    };

    const isPending = addTransactionMutation.isPending || updateTransactionMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {transaction ? 'Edit Transaction' : 'Add New Transaction'}
                    </DialogTitle>
                    <div hidden id="dialog-description" aria-describedby="dialog-description">
                        {transaction ? 'Make changes to the transaction details.' : 'Enter the details for the new transaction.'}
                    </div>
                </DialogHeader>

                {isLoadingMembers ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        <div className="space-y-4 py-4">
                            {initialTargetUserId && targetUser ? (
                                <div className="space-y-2">
                                    <Label>Member</Label>
                                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                                        <Avatar className="h-9 w-9 border border-primary/10">
                                            <AvatarImage src={targetUser.image || ''} />
                                            <AvatarFallback className="bg-primary/5 text-primary">
                                                {targetUser.name?.charAt(0) || <User className="h-4 w-4" />}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{targetUser.name}</span>
                                            {targetUser.email && (
                                                <span className="text-xs text-muted-foreground">{targetUser.email}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                !initialTargetUserId && members.length > 0 && (
                                    <div className="space-y-2">
                                        <Label htmlFor="member">Select Member</Label>
                                        <Popover open={isMemberPopoverOpen} onOpenChange={setIsMemberPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={isMemberPopoverOpen}
                                                    className="w-full h-12 justify-between px-3 bg-background hover:bg-background/80 transition-all border-dashed hover:border-solid hover:ring-2 hover:ring-primary/20"
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        {targetUserId ? (
                                                            <>
                                                                <Avatar className="h-7 w-7 border-2 border-primary/20">
                                                                    <AvatarImage src={members.find((m: MemberWithBalance) => m.userId === targetUserId)?.user?.image || ''} />
                                                                    <AvatarFallback className="bg-primary/5 text-primary">
                                                                        <User className="h-3.5 w-3.5" />
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="font-medium truncate max-w-[180px]">
                                                                    {members.find((m: MemberWithBalance) => m.userId === targetUserId)?.user.name}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                                                                    <User className="h-3.5 w-3.5 text-muted-foreground/50" />
                                                                </div>
                                                                <span className="text-muted-foreground font-normal">Choose a member...</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-xl border-primary/10 rounded-xl overflow-hidden" align="start">
                                                <Command className="rounded-none border-none">
                                                    <CommandInput placeholder="Search members by name or email..." className="h-11 border-b" />
                                                    <CommandList className="max-h-[300px]">
                                                        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                                                            <User className="h-8 w-8 opacity-20" />
                                                            No members found.
                                                        </CommandEmpty>
                                                        <CommandGroup heading="Group Members" className="p-2">
                                                            {members.map((m: MemberWithBalance) => (
                                                                <CommandItem
                                                                    key={m.userId}
                                                                    value={m.user.name + ' ' + (m.user.email || '')}
                                                                    onSelect={() => {
                                                                        setTargetUserId(m.userId);
                                                                        setIsMemberPopoverOpen(false);
                                                                    }}
                                                                    className="flex items-center justify-between rounded-lg py-2.5 px-3 mb-1 data-[selected='true']:bg-primary/5 cursor-pointer transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                                                        <Avatar className="h-9 w-9 border shadow-sm transition-transform group-hover:scale-105">
                                                                            <AvatarImage src={m.user.image || ''} />
                                                                            <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                                                                                {m.user.name?.charAt(0) || <User className="h-4 w-4" />}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className="font-semibold text-sm leading-tight truncate">{m.user.name}</span>
                                                                            <span className="text-xs text-muted-foreground truncate opacity-70">
                                                                                {m.user.email || 'No email provided'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {targetUserId === m.userId && (
                                                                        <div className="ml-2 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                                                                            <Check className="h-3 w-3 text-primary stroke-[3px]" />
                                                                        </div>
                                                                    )}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount (৳)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Input
                                    id="description"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="e.g. Monthly payment, Cash deposit"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger id="type" className="w-full">
                                        <SelectValue placeholder="Select a type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PAYMENT">Payment</SelectItem>
                                        <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                                        <SelectItem value="REFUND">Refund</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="flex gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} className="flex-1 sm:flex-none" disabled={isPending}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        {transaction ? 'Save Changes' : (
                                            <>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Transaction
                                            </>
                                        )}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
