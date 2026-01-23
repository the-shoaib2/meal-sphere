import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';
import { fetchExpensesData } from '@/lib/services/expenses-service';
import { fetchGroupAccessData } from '@/lib/services/groups-service';
import { ExpensesPageContent } from '@/components/finance/expenses-page-content';
import { NoGroupState } from "@/components/empty-states/no-group-state";
import { NoPeriodState } from "@/components/empty-states/no-period-state";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
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
          heading="Extra Expenses"
          text="Track additional expenses"
          className="mb-0"
        />
        <NoGroupState />
      </div>
    );
  }

  // 2. Fetch Initial Data for the active group (Expenses and Access)
  const [expensesData, accessData] = await Promise.all([
    fetchExpensesData(session.user.id, activeGroup.id),
    fetchGroupAccessData(activeGroup.id, session.user.id)
  ]);

  // 3. Handle No Period State server-side
  if (!expensesData.currentPeriod) {
    const isPrivileged = ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(accessData.userRole || '');
    return (
      <div className="space-y-6">
        <PageHeader
          heading="Extra Expenses"
          text={`Track additional expenses for ${activeGroup.name}`}
          className="mb-0"
        />
        <NoPeriodState
          isPrivileged={isPrivileged}
          periodMode={expensesData.roomData?.periodMode || 'MONTHLY'}
        />
      </div>
    );
  }

  // 4. Render client component (Content Wrapper) to handle dialog state
  return (
    <ExpensesPageContent
      activeGroup={activeGroup}
      userRole={accessData.userRole}
      initialData={{
        ...expensesData,
        groupId: activeGroup.id
      }}
      initialAccessData={accessData}
    />
  );
}
