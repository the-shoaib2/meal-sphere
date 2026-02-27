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
import { cn } from '@/lib/utils';
import {
  DollarSign,
  Receipt,
  Utensils,
  Calculator,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionHistory } from '@/components/account-balance/transaction-history';
import type { UserBalance, AccountTransaction } from '@/hooks/use-account-balance';
import { NumberTicker } from "@/components/ui/number-ticker";

import { Session } from 'next-auth';
import { useInView } from 'react-intersection-observer';
import { Role } from '@prisma/client';

interface MemberViewProps {
  balance: UserBalance | undefined;
  transactions: AccountTransaction[];
  userRole: Role;
  session: Session | null;
  groupId?: string;
  onFetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

export function MemberView({
  balance,
  transactions,
  userRole,
  session,
  groupId,
  onFetchNextPage,
  hasNextPage,
  isFetchingNextPage
}: MemberViewProps) {
  const [historyView, setHistoryView] = React.useState<string | null>(null);

  const { ref, inView } = useInView({
    rootMargin: '200px',
  });

  React.useEffect(() => {
    if (inView && hasNextPage && onFetchNextPage) {
      onFetchNextPage();
    }
  }, [inView, hasNextPage, onFetchNextPage]);

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
        <Card className="cursor-pointer transition-all hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 group">
          <CardHeader className="pb-3 px-3 sm:px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-lg font-semibold tracking-tight">Current Balance</CardTitle>
              <div className="p-1.5 sm:p-2 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 group-hover:scale-110 transition-transform">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4">
            <div className="space-y-2">
              <p className={cn("text-3xl sm:text-4xl font-bold tracking-tight", currentBalance >= 0 ? "text-green-600" : "text-red-600")}>
                {currentBalance < 0 && "-"}৳
                <NumberTicker value={Math.abs(currentBalance)} decimalPlaces={2} />
              </p>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-muted-foreground font-medium">Available:</span>
                <span className={cn("font-bold text-base sm:text-lg", availableBalance >= 0 ? "text-green-600" : "text-red-600")}>
                  {availableBalance < 0 && "-"}৳
                  <NumberTicker value={Math.abs(availableBalance)} decimalPlaces={2} />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all hover:bg-amber-500/5 dark:hover:bg-amber-500/10 group">
          <CardHeader className="pb-3 px-3 sm:px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-lg font-semibold tracking-tight">Meal Summary</CardTitle>
              <div className="p-1.5 sm:p-2 rounded-full bg-amber-500/10 dark:bg-amber-500/20 group-hover:scale-110 transition-transform">
                <Utensils className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4">
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">Total Meals</span>
                <span className="font-bold text-foreground">{balance?.mealCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border/50 pt-2.5 sm:pt-3">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">Meal Rate</span>
                <span className="font-bold text-blue-600">
                  ৳<NumberTicker value={balance?.mealRate ?? 0} decimalPlaces={2} />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">Total Spent</span>
                <span className="font-bold text-red-600">
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

      {/* Transaction History Section */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between px-3 sm:px-6">
          <CardTitle className="text-sm sm:text-lg font-bold">
            {historyView ? (historyView === "ALL" ? "Global Audit Log" : "Transaction Detail") : "Transaction History"}
          </CardTitle>
          <Button
            onClick={() => setHistoryView(historyView ? null : "ALL")}
            className="font-bold text-[10px] sm:text-xs uppercase tracking-tight h-8 sm:h-9"
          >
            {historyView ? (
              <><EyeOff className="mr-2 h-4 w-4" /> Hide Log</>
            ) : (
              <><Eye className="mr-2 h-4 w-4" /> View History</>
            )}
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 transition-all duration-300">
          {historyView ? (
            <TransactionHistory
              transactionId={historyView}
              userId={session?.user?.id}
              roomId={groupId}
              onBack={() => setHistoryView(null)}
            />
          ) : (
            <>
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {/* Desktop View - Table */}
                  <div className="hidden md:block rounded-md border border-border/50 overflow-hidden">
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-muted/50 z-10 shadow-sm">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="font-bold">Description</TableHead>
                            <TableHead className="font-bold">Type</TableHead>
                            <TableHead className="text-right font-bold">Amount</TableHead>
                            <TableHead className="text-right font-bold">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((transaction, index) => (
                            <TransactionRow
                              key={`${transaction.id}-${index}`}
                              transaction={transaction}
                              currentUserId={session?.user?.id}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Mobile View - Cards */}
                  <div className="md:hidden space-y-3 p-3">
                    {transactions.map((transaction, index) => {
                      const isSender = transaction.userId === session?.user?.id;
                      const isReceiver = transaction.targetUserId === session?.user?.id;
                      const amount = isReceiver ? transaction.amount : -transaction.amount;
                      const transactionType = isSender ? 'Sent' : 'Received';

                      return (
                        <Card key={`${transaction.id}-${index}`} className="bg-card/50 shadow-none border border-border/50 hover:border-primary/30 transition-colors">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant={isSender ? "destructive" : "default"} className="text-[10px] font-bold uppercase tracking-wider">
                                {transactionType}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {new Date(transaction.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-end justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold truncate">{transaction.description || 'Transaction'}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {isSender ? `To: ${transaction.targetUser?.name || 'Unknown'}` : `From: ${transaction.creator?.name || 'Unknown'}`}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={cn("text-base font-bold tracking-tight", amount >= 0 ? "text-green-600" : "text-red-600")}>
                                  {amount >= 0 ? '+' : '-'}৳{Math.abs(amount).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Infinite Scroll Sentinel */}
                  {(hasNextPage || isFetchingNextPage) && (
                    <div className="m-3 md:m-0 rounded-md border border-border/50 border-dashed">
                      <div ref={ref} className="flex justify-center p-4">
                        {isFetchingNextPage ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-muted-foreground font-medium">Loading more...</span>
                          </div>
                        ) : (
                          <span className="h-4 w-full block" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto opacity-20 mb-4" />
                  <p className="text-sm font-medium">No transactions found</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const QuickStat = ({ icon: Icon, title, value, color, isCurrency = false }: {
  icon: any,
  title: string,
  value: number,
  color: string,
  isCurrency?: boolean
}) => (
  <Card className="hover:bg-accent/5 transition-colors">
    <CardContent className="p-3 sm:p-4">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="p-1.5 sm:p-2 bg-muted/50 rounded-md">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate uppercase tracking-widest">{title}</p>
          <p className={cn("text-sm sm:text-base font-bold truncate", color)}>
            {isCurrency && "৳"}
            <NumberTicker value={Math.abs(value)} decimalPlaces={isCurrency ? 2 : 0} />
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
    <TableRow className="group">
      <TableCell className="font-medium">
        <div>
          <p className="text-sm font-bold group-hover:text-primary transition-colors">{transaction.description || 'Transaction'}</p>
          <p className="text-xs text-muted-foreground">
            {isSender ? `To: ${transaction.targetUser?.name || 'Unknown'}` : `From: ${transaction.creator?.name || 'Unknown'}`}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={isSender ? "destructive" : "default"} className="text-[10px] font-bold uppercase tracking-wider h-5">
          {transactionType}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <span className={cn("font-bold", amount >= 0 ? "text-green-600" : "text-red-600")}>
          {amount >= 0 ? '+' : '-'}৳{Math.abs(amount).toFixed(2)}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="text-sm font-bold">
          {new Date(transaction.createdAt).toLocaleDateString()}
        </div>
        <div className="text-[10px] text-muted-foreground font-medium">
          {new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </TableCell>
    </TableRow>
  );
};