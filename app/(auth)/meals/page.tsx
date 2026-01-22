import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';
import { fetchMealsData } from '@/lib/services/meals-service';
import { fetchGroupAccessData, fetchGroupsData } from '@/lib/services/groups-service';
import MealManagement from "@/components/meal/meal-management";
import { NoGroupState } from "@/components/empty-states/no-group-state";
import { NoPeriodState } from "@/components/empty-states/no-period-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';

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
        <PageHeader
          heading="Meal Management"
          text="Track and manage your meals"
        />
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
        <PageHeader
          heading="Meal Management"
          text={
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Track and manage your meals for {activeGroup.name}</span>
              {accessData.userRole && (
                <Badge variant="default" className="bg-red-500 text-white hover:bg-red-600 transition-colors uppercase tracking-wider text-[10px] font-bold px-2 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {accessData.userRole}
                </Badge>
              )}
            </div>
          }
        />
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


