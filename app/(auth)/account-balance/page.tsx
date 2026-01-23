import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';
import { fetchAccountBalanceData } from '@/lib/services/balance-service';
import { AccountBalancePanel } from '@/components/account-balance/account-balance';
import { NoGroupState } from "@/components/empty-states/no-group-state";
import { NoPeriodState } from "@/components/empty-states/no-period-state";
import { PageHeader } from "@/components/shared/page-header";
import { hasBalancePrivilege } from '@/lib/auth/balance-permissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AccountBalancePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // 1. Resolve Active Group
  const activeMember = await prisma.roomMember.findFirst({
    where: { userId: session.user.id, isCurrent: true },
    include: { room: true }
  });

  const activeGroup = activeMember?.room;

  if (!activeGroup) {
    return (
      <div className="space-y-6">
        <PageHeader
          heading="Account Balance"
          text="Track your meal expenses and payments"
        />
        <NoGroupState />
      </div>
    );
  }

  // 2. Fetch Initial Data for the active group
  const balanceData = await fetchAccountBalanceData(session.user.id, activeGroup.id);
  const currentPeriod = balanceData.currentPeriod;
  const hasPrivilege = hasBalancePrivilege(activeMember.role);

  // 3. Handle No Period State server-side
  if (!currentPeriod) {
    return (
      <div className="space-y-6">
        <PageHeader
          heading="Account Balance"
          text={`Track your meal expenses and payments for ${activeGroup.name}`}
        />
        <NoPeriodState
          isPrivileged={hasPrivilege}
          periodMode={balanceData.summary?.roomData?.periodMode || 'MONTHLY'}
        />
      </div>
    );
  }

  // 4. Render client component with initial data
  return (
    <div className="space-y-6">
      <PageHeader
        heading="Account Balances"
        text={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span>Manage all user balances and transactions.</span>
            {currentPeriod && (
              <Badge variant={currentPeriod.isLocked ? "destructive" : "default"} className="text-xs w-fit">
                {currentPeriod.name} {currentPeriod.isLocked ? "(Locked)" : ""}
              </Badge>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-2">
          {hasPrivilege && (
            <Button size="sm" asChild className="w-full sm:w-auto shadow-sm transition-all hover:shadow-md active:scale-95">
              <Link href="?add=true">
                <Plus className="h-4 w-4 mr-2" /> Add Balance
              </Link>
            </Button>
          )}
          <Badge
            variant={hasPrivilege ? "default" : "outline"}
            className={hasPrivilege ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {activeMember.role ? activeMember.role.replace('_', ' ') : 'MEMBER'}
          </Badge>
        </div>
      </PageHeader>
      <AccountBalancePanel
        initialData={{
          ...balanceData,
          groupId: activeGroup.id
        }}
      />
    </div>
  );
}
