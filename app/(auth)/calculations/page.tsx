import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';
import { fetchCalculationsData } from '@/lib/services/calculations-service';
import MealCalculations from "@/components/calculations/calculations";
import { NoGroupState } from "@/components/empty-states/no-group-state";
import { NoPeriodState } from "@/components/empty-states/no-period-state";
import { fetchGroupAccessData } from '@/lib/services/groups-service';
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = 'force-dynamic';

export default async function CalculationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Resolve Active Group
  const activeMember = await prisma.roomMember.findFirst({
    where: { userId: session.user.id, isCurrent: true },
    include: { room: true }
  });

  const activeGroup = activeMember?.room;

  if (!activeGroup) {
    return (
      <div className="space-y-2">
        <PageHeader
          heading="Calculations"
          description="View meal calculations and balances"
        />
        <NoGroupState />
      </div>
    );
  }

  // Fetch Initial Data for the active group
  const [calculationsData, accessData] = await Promise.all([
    fetchCalculationsData(session.user.id, activeGroup.id),
    fetchGroupAccessData(activeGroup.id, session.user.id)
  ]);

  // Handle No Period State server-side
  if (!calculationsData.currentPeriod) {
    const isPrivileged = ['ADMIN', 'MANAGER'].includes(accessData.userRole || '');
    return (
      <div className="space-y-2">
        <PageHeader
          heading="Calculations"
          description={`View detailed meal rates for ${activeGroup.name}`}
        />
        <NoPeriodState
          isPrivileged={isPrivileged}
          periodMode={calculationsData.roomData?.periodMode || 'MONTHLY'}
        />
      </div>
    );
  }

  return (
    <MealCalculations
      roomId={activeGroup.id}
      initialData={{
        ...calculationsData,
        groupId: activeGroup.id
      }}
    />
  );
}
