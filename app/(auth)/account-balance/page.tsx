import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';
import { fetchAccountBalanceData } from '@/lib/services/balance-service';
import AccountBalancePanel from '@/components/account-balance/account-balance';
import { NoGroupState } from "@/components/empty-states/no-group-state";
import { NoPeriodState } from "@/components/empty-states/no-period-state";
import { PageHeader } from "@/components/shared/page-header";

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

  // 3. Handle No Period State server-side
  if (!balanceData.currentPeriod) {
    const isPrivileged = ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(balanceData.userRole || '');
    return (
      <div className="space-y-6">
        <PageHeader
          heading="Account Balance"
          text={`Track your meal expenses and payments for ${activeGroup.name}`}
        />
        <NoPeriodState
          isPrivileged={isPrivileged}
          periodMode={balanceData.summary?.roomData?.periodMode || 'MONTHLY'}
        />
      </div>
    );
  }

  // 4. Render client component with initial data
  return (
    <div className="space-y-6">
      <AccountBalancePanel
        initialData={{
          ...balanceData,
          groupId: activeGroup.id
        }}
      />
    </div>
  );
}
