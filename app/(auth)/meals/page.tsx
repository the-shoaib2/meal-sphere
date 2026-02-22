import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { fetchMealsData } from '@/lib/services/meals-service';
import { parseDateSafe } from '@/lib/utils/period-utils-shared';
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
      <div className="space-y-2">
        <PageHeader
          heading="Meals"
          description="Track and manage your meals"
        />
        <NoGroupState />
      </div>
    );
  }

  // 2. Fetch Initial Data for the active group
  // Resolve date from search params to ensure we fetch data for the correct period
  const dateParam = resolvedSearchParams?.date ? parseDateSafe(resolvedSearchParams.date) : undefined;

  let mealsData: any = null;
  let accessData: any = null;

  try {
    const [fetchedMealsData, fetchedAccessData] = await Promise.all([
      fetchMealsData(session.user.id, activeGroup.id, { date: dateParam }),
      fetchGroupAccessData(activeGroup.id, session.user.id)
    ]);
    mealsData = fetchedMealsData;
    accessData = fetchedAccessData;
  } catch (error) {
    console.error("[SSR Error /meals]:", error);
    return (
      <div className="space-y-2">
        <PageHeader heading="Meals" description="Track and manage your meals" />
        <div className="p-6 text-center text-red-500 border rounded-lg bg-red-50/50">
          <p className="font-semibold">Failed to load meal data.</p>
          <p className="text-sm opacity-80 mt-1">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  // 3. Handle No Period State server-side
  if (!mealsData.currentPeriod) {
    const isPrivileged = ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(accessData.userRole || '');
    return (
      <div className="space-y-2">
        <PageHeader
          heading="Meal Management"
          description={`Track and manage your meals for ${activeGroup.name}`}
          badges={
            accessData.userRole && (
              <Badge variant="destructive" className="bg-red-500 text-white hover:bg-red-600 transition-colors uppercase tracking-wider text-[10px] font-bold px-2 flex items-center gap-1 shrink-0 shadow-sm">
                <ShieldCheck className="h-3 w-3" />
                {accessData.userRole}
              </Badge>
            )
          }
        />
        <NoPeriodState
          isPrivileged={isPrivileged}
          periodMode={(mealsData.roomData as any)?.periodMode || 'MONTHLY'}
        />
      </div>
    );
  }

  // 4. Render client component with initial data
  return (
    <div className="space-y-2">
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


