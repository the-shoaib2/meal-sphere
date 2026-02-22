'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, CreditCard, Receipt, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { RoleBadge } from '@/components/shared/role-badge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createManualPaymentAction } from '@/lib/actions/payment.actions';

interface PaymentManagementProps {
    initialData?: any;
    initialAccessData?: any;
}

export function PaymentManagement({ initialData, initialAccessData }: PaymentManagementProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { data: session } = useSession();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('history');
    const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');

    const payments = initialData?.payments || [];
    const currentPeriod = initialData?.currentPeriod;
    const isPrivileged = ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(initialAccessData?.userRole || '');

    const createPaymentMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await createManualPaymentAction(data);

            if (!response.success) {
                throw new Error(response.message || 'Failed to create payment');
            }
            return response.payment;
        },
        onSuccess: () => {
            toast({ title: 'Success', description: 'Payment recorded successfully' });
            setShowAddPaymentDialog(false);
            setAmount('');
            setDescription('');
            router.refresh();
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    });

    const handleCreatePayment = () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            toast({ title: "Invalid Amount", description: "Please enter a valid amount", variant: "destructive" });
            return;
        }

        createPaymentMutation.mutate({
            roomId: initialData.groupId,
            amount: Number(amount),
            method: paymentMethod,
            description: description || 'Manual Payment',
            date: new Date().toISOString()
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                heading="Payments"
                description="Track and manage group payments"
                badges={<RoleBadge role={initialAccessData?.userRole} />}
                badgesNextToTitle={true}
                collapsible={false}
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                    <TabsList>
                        <TabsTrigger value="history">History</TabsTrigger>
                        <TabsTrigger value="methods">Methods</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-2">
                    <Button onClick={() => router.push('/payments/bkash')}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Bkash Pay
                    </Button>
                    {isPrivileged && (
                        <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
                            <DialogTrigger asChild>
                                <Button variant="default">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Record Payment
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Record Manual Payment</DialogTitle>
                                    <DialogDescription>Record a payment received from a member.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Amount</Label>
                                        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Method</Label>
                                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CASH">Cash</SelectItem>
                                                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                                <SelectItem value="MOBILE_BANKING">Mobile Banking</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Notes (Optional)</Label>
                                        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. For Month of June" />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowAddPaymentDialog(false)}>Cancel</Button>
                                    <Button onClick={handleCreatePayment} disabled={createPaymentMutation.isPending}>
                                        {createPaymentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Record'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>
                        Recent payments for the current period
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {payments.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Member</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((payment: any) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{format(new Date(payment.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {/* Avatar placeholder if needed */}
                                                <span className="font-medium">{payment.user?.name || 'Unknown'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{payment.method}</Badge></TableCell>
                                        <TableCell className="max-w-[200px] truncate">{payment.description}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(payment.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={payment.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                                {payment.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No payments recorded for this period yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
