import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';
import { fetchShoppingData } from '@/lib/services/shopping-service';
import { fetchGroupAccessData } from '@/lib/services/groups-service';
import ShoppingManagement from "@/components/market/shopping-management";
import { NoGroupState } from "@/components/empty-states/no-group-state";
import { NoPeriodState } from "@/components/empty-states/no-period-state";

export const dynamic = 'force-dynamic';

export default async function ShoppingPage() {
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
            <h1 className="text-3xl font-bold tracking-tight">Shopping List</h1>
            <p className="text-muted-foreground text-sm">
              Manage your shopping items
            </p>
          </div>
        </div>
        <NoGroupState />
      </div>
    );
  }

  // 2. Fetch Initial Data for the active group
  const [shoppingData, accessData] = await Promise.all([
    fetchShoppingData(session.user.id, activeGroup.id),
    fetchGroupAccessData(activeGroup.id, session.user.id)
  ]);

  // 3. Handle No Period State server-side
  if (!shoppingData.currentPeriod) {
    const isPrivileged = ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(accessData.userRole || '');
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shopping List</h1>
            <p className="text-muted-foreground text-sm">
              Manage your shopping items for {activeGroup.name}
            </p>
          </div>
        </div>
        <NoPeriodState
          isPrivileged={isPrivileged}
          periodMode={shoppingData.roomData?.periodMode || 'MONTHLY'}
        />
      </div>
    );
  }

  // 4. Render client component with initial data
  return (
    <div className="space-y-6">
      <ShoppingManagement
        initialData={{
          ...shoppingData,
          groupId: activeGroup.id
        }}
        initialAccessData={accessData}
      />
    </div>
  );
}
