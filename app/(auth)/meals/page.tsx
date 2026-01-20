import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';
import { fetchMealsData } from '@/lib/services/meals-service';
import { fetchGroupAccessData, fetchGroupsData } from '@/lib/services/groups-service';
import MealManagement from "@/components/meal/meal-management";
import { NoGroupState } from "@/components/empty-states/no-group-state";
import { NoPeriodState } from "@/components/empty-states/no-period-state";

export const dynamic = 'force-dynamic';

export default async function MealsPage({ searchParams }: { searchParams: Promise<any> }) {
  const resolvedSearchParams = await searchParams;
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meal Management</h1>
            <p className="text-muted-foreground text-sm">
              Track and manage your meals
            </p>
          </div>
        </div>
        <NoGroupState />
      </div>
    );
  }

  // 2. Fetch Initial Data for the active group
  const [mealsData, accessData] = await Promise.all([
    fetchMealsData(session.user.id, activeGroup.id),
    fetchGroupAccessData(activeGroup.id, session.user.id)
  ]);

  // 3. Handle No Period State server-side
  if (!mealsData.currentPeriod) {
    const isPrivileged = ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(accessData.userRole || '');
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meal Management</h1>
            <p className="text-muted-foreground text-sm">
              Track and manage your meals for {activeGroup.name}
            </p>
          </div>
        </div>
        <NoPeriodState
          isPrivileged={isPrivileged}
          periodMode={mealsData.roomData?.periodMode || 'MONTHLY'}
        />
      </div>
    );
  }

  // 4. Render client component with initial data
  return (
    <div className="space-y-6">
      <MealManagement
        roomId={activeGroup.id}
        groupName={activeGroup.name}
        searchParams={resolvedSearchParams}
        initialData={{
          ...mealsData,
          groupId: activeGroup.id
        }}
        initialAccessData={accessData}
      />
    </div>
  );
}


