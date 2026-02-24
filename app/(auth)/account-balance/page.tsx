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
import { AddBalanceButton } from '@/components/account-balance/add-balance-button';
import { RoleBadge } from '@/components/shared/role-badge';


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
      <div className="space-y-2">
        <PageHeader
          heading="Account Balance"
          description="Track your meal expenses and payments"
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
      <div className="space-y-2">
        <PageHeader
          heading="Account Balance"
          description={`Track your meal expenses and payments for ${activeGroup.name}`}
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
    <div className="space-y-2">
      <PageHeader
        heading="Account Balances"
        description={
          <div className="flex flex-col gap-1.5">
            <div className="flex sm:hidden flex-wrap items-center gap-1.5 mb-1">
              {currentPeriod && (
                <Badge variant={currentPeriod.isLocked ? "destructive" : "default"} className="text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest shadow-sm">
                  {currentPeriod.name} {currentPeriod.isLocked ? " Locked" : " Active"}
                </Badge>
              )}
            </div>
            <span className="text-muted-foreground/90 font-medium text-sm">
              Manage all user balances and transactions.
            </span>
          </div>
        }
        badgesNextToTitle={true}
        collapsible={false}
        badges={  
          <div className="flex items-center gap-2">
            <RoleBadge role={activeMember.role} />
            {currentPeriod && (
              <Badge variant={currentPeriod.isLocked ? "destructive" : "default"} className="hidden sm:flex text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest shadow-sm">
                {currentPeriod.name} {currentPeriod.isLocked ? " Locked" : " Active"}
              </Badge>
            )}
          </div>
        }
      >
        {hasPrivilege && (
          <AddBalanceButton />
        )}
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
