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
import { canViewUserBalance, hasBalancePrivilege } from '@/lib/auth/balance-permissions';

import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
  const hasPrivilege = hasBalancePrivilege(activeMember.role);
  const isAdmin = activeMember.role === 'ADMIN';
  const isOwner = session.user.id === userId;

  // STRICT ACCESS: Only Admin or Owner can view this page
  if (!isAdmin && !isOwner) {
    return (
      <div className="space-y-6">
        <PageHeader
          heading="Account Details"
          text="Security & Permissions"
        />
        <InsufficientPermissionsState
          description="You don't have the required permissions to view this user's account details. Only admins and the account owner can view this page."
        />
      </div>
    );
  }

  // 3. Fetch Initial Data for the target user in the active group
  const balanceData = await fetchAccountBalanceData(userId, activeGroup.id);
  // 3. Handle No Period State server-side
  if (!balanceData.currentPeriod) {
    return (
      <div className="space-y-6">
        <PageHeader
          heading="Account Details"
          text={`Manage balances for ${activeGroup.name}`}
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
        heading="Account Details"
        text={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 px-2 text-muted-foreground hover:text-foreground">
              <Link href="/account-balance">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Link>
            </Button>
            <span className="text-muted-foreground">|</span>
            <span>View and manage specific user accounts</span>
          </div>
        }
      >
        {isAdmin && (
          <Button size="sm" asChild className="w-full sm:w-auto shadow-sm transition-all hover:shadow-md active:scale-95">
            <Link href="?add=true">
              <Plus className="h-4 w-4 mr-2" /> Add Balance
            </Link>
          </Button>
        )}
      </PageHeader>
      <UserAccountBalanceDetail
        targetUserId={userId}
        viewerRole={activeMember.role}
        initialData={{
          ...balanceData,
          groupId: activeGroup.id
        }}
      />
    </div>
  );
}
