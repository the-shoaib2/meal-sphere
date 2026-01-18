import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface AccountInfoCardProps {
    userBalance: any; // Ideally this should be typed properly, e.g., from your hooks
    targetUserRole: string;
    availableBalance: number;
    totalSpent: number;
    totalReceived: number;
    totalTransactions: number;
}

const getRoleBadgeVariant = (role: string) => {
    switch (role) {
        case 'ADMIN': return 'default';
        case 'ACCOUNTANT': return 'default';
        default: return 'outline';
    }
};

const getRoleBadgeStyle = (role: string) => {
    switch (role) {
        case 'ADMIN': return 'bg-blue-600 hover:bg-blue-700';
        case 'ACCOUNTANT': return 'bg-green-600 hover:bg-green-700';
        default: return '';
    }
};

export function AccountInfoCard({
    userBalance,
    targetUserRole,
    availableBalance,
    totalSpent,
    totalReceived,
    totalTransactions
}: AccountInfoCardProps) {
    return (
        <Card>
            <CardContent className="p-4">
                {/* User Info */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border">
                            <AvatarImage src={userBalance?.user?.image} />
                            <AvatarFallback className="text-lg font-semibold">
                                {userBalance?.user?.name?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold">{userBalance?.user?.name}</h3>
                                <Badge
                                    variant={getRoleBadgeVariant(targetUserRole)}
                                    className={getRoleBadgeStyle(targetUserRole)}
                                >
                                    {targetUserRole.replace('_', ' ')}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{userBalance?.user?.email}</p>
                        </div>
                    </div>
                </div>

                <Separator className="my-4" />

                {/* Stats Grid - Responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                        <p className={`text-lg sm:text-xl font-bold ${availableBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ৳{availableBalance.toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
                        <p className="text-lg sm:text-xl font-bold text-red-600">৳{totalSpent.toFixed(2)}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm text-muted-foreground mb-1">Total Received</p>
                        <p className="text-lg sm:text-xl font-bold text-green-600">৳{totalReceived.toFixed(2)}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm text-muted-foreground mb-1">Total Transactions</p>
                        <p className="text-lg sm:text-xl font-bold">{totalTransactions}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
