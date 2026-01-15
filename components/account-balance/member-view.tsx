"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DollarSign,
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  Utensils, 
  Calculator,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import type { UserBalance, AccountTransaction } from '@/hooks/use-account-balance';
import { NumberTicker } from "@/components/ui/number-ticker";

import { Session } from 'next-auth';

interface MemberViewProps {
  balance: UserBalance | undefined;
  transactions: AccountTransaction[];
  userRole: string;
  session: Session | null;
}

export default function MemberView({ balance, transactions, userRole, session }: MemberViewProps) {
  const totalReceived = transactions
    .filter(t => t.targetUserId === session?.user?.id)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSent = transactions
    .filter(t => t.userId === session?.user?.id)
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = balance?.balance ?? 0;
  const availableBalance = balance?.availableBalance ?? 0;
  const netFlow = totalReceived - totalSent;

  return (
    <div className="space-y-4">
      {/* Main Balance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Current Balance</CardTitle>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className={`text-4xl font-bold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currentBalance < 0 && "-"}৳
                <NumberTicker value={Math.abs(currentBalance)} decimalPlaces={2} />
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Available:</span>
                <span className={`font-semibold text-lg ${availableBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {availableBalance < 0 && "-"}৳
                  <NumberTicker value={Math.abs(availableBalance)} decimalPlaces={2} />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Meal Summary</CardTitle>
              <Utensils className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Meals</span>
                <span className="font-medium">{balance?.mealCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Meal Rate</span>
                <span className="font-medium text-blue-600">
                  ৳<NumberTicker value={balance?.mealRate ?? 0} decimalPlaces={2} />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Spent</span>
                <span className="font-medium text-red-600">
                  ৳<NumberTicker value={balance?.totalSpent ?? 0} decimalPlaces={2} />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickStat
          icon={Receipt}
          title="Transactions"
          value={transactions.length}
          color="text-blue-600"
        />
        <QuickStat
          icon={TrendingUp}
          title="Received"
          value={totalReceived}
          isCurrency
          color="text-green-600"
        />
        <QuickStat
          icon={TrendingDown}
          title="Sent"
          value={totalSent}
          isCurrency
          color="text-red-600"
        />
        <QuickStat
          icon={Calculator}
          title="Net Flow"
          value={netFlow}
          isCurrency
          color={netFlow >= 0 ? "text-green-600" : "text-red-600"}
        />
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      currentUserId={session?.user?.id}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No transactions yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const QuickStat = ({ icon: Icon, title, value, color, isCurrency = false }: {
  icon: React.ElementType,
  title: string,
  value: string | number,
  color: string,
  isCurrency?: boolean
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-md">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className={`text-sm font-semibold truncate ${color}`}>
            {typeof value === 'number' ? (
              <>
                {isCurrency && (value < 0 ? "-" : "")}
                {isCurrency && "৳"}
                <NumberTicker value={Math.abs(value)} decimalPlaces={isCurrency ? 2 : 0} />
              </>
            ) : value}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const TransactionRow = ({ transaction, currentUserId }: {
  transaction: AccountTransaction,
  currentUserId?: string
}) => {
  const isSender = transaction.userId === currentUserId;
  const isReceiver = transaction.targetUserId === currentUserId;
  const amount = isReceiver ? transaction.amount : -transaction.amount;
  const transactionType = isSender ? 'Sent' : 'Received';

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div>
          <p className="text-sm">{transaction.description || 'Transaction'}</p>
          <p className="text-xs text-muted-foreground">
            {isSender ? `To: ${transaction.targetUser?.name || 'Unknown'}` : `From: ${transaction.creator?.name || 'Unknown'}`}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={isSender ? "destructive" : "default"} className="text-xs">
          {transactionType}
        </Badge>
      </TableCell>
      <TableCell>
        <span className={`font-medium ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {amount >= 0 ? '+' : '-'}৳{Math.abs(amount).toFixed(2)}
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(transaction.createdAt).toLocaleDateString()}
        <br />
        <span className="text-xs">
          {new Date(transaction.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </TableCell>
    </TableRow>
  );
}; 