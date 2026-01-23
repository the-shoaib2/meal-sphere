import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';
import { fetchAccountBalanceData } from '@/lib/services/balance-service';
import { UserAccountBalanceDetail } from '@/components/account-balance/account-balance';
import { NoGroupState } from "@/components/empty-states/no-group-state";
import { NoPeriodState } from "@/components/empty-states/no-period-state";
import { InsufficientPermissionsState } from "@/components/empty-states/insufficient-permissions-state";
import { PageHeader } from "@/components/shared/page-header";
import { canViewUserBalance } from '@/lib/auth/balance-permissions';

export const dynamic = 'force-dynamic';

export default async function UserAccountBalancePage({ params }: { params: Promise<any> }) {
  const resolvedParams = await params;
  const userId = resolvedParams.id;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // 1. Resolve Active Group for the current user
  const activeMember = await prisma.roomMember.findFirst({
    where: { userId: session.user.id, isCurrent: true },
    include: { room: true }
  });

  const activeGroup = activeMember?.room;

  if (!activeGroup) {
    return (
      <div className="space-y-6">
        <PageHeader
          heading="Account Details"
          text="Manage user balances and transactions"
        />
        <NoGroupState />
      </div>
    );
  }

  // 2. Permission Check: Can this user view the target user's balance?
  if (!canViewUserBalance(activeMember.role, session.user.id, userId)) {
    return (
      <div className="space-y-6">
        <PageHeader
          heading="Account Details"
          text="Security & Permissions"
        />
        <InsufficientPermissionsState
          description="You don't have the required permissions to view this user's account details. Only admins, accountants, and the account owner can view this page."
        />
      </div>
    );
  }

  // 3. Fetch Initial Data for the target user in the active group
  const balanceData = await fetchAccountBalanceData(userId, activeGroup.id);

  // 3. Handle No Period State server-side
  if (!balanceData.currentPeriod) {
    const isPrivileged = ['ADMIN', 'ACCOUNTANT', 'MANAGER'].includes(balanceData.userRole || '');
    return (
      <div className="space-y-6">
        <PageHeader
          heading="Account Details"
          text={`Manage balances for ${activeGroup.name}`}
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
      <UserAccountBalanceDetail
        targetUserId={userId}
        initialData={{
          ...balanceData,
          groupId: activeGroup.id
        }}
      />
    </div>
  );
} 