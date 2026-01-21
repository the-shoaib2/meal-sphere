import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';
import { fetchMarketDates } from '@/lib/services/market-service';
import { MarketDateList } from '@/components/market/market-date-list';
import { NoGroupState } from "@/components/empty-states/no-group-state";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = 'force-dynamic';

export default async function MarketPage() {
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
                    heading="Market Dates"
                    text="Manage market dates and assignments"
                />
                <NoGroupState />
            </div>
        );
    }

    // 2. Fetch Initial Data for the active group
    const marketDates = await fetchMarketDates(activeGroup.id);

    // 3. Determine user role for permissions
    const isManager = ['ADMIN', 'MANAGER', 'MARKET_MANAGER'].includes(activeMember.role);

    // 4. Render client component with initial data
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 xs:flex-row xs:items-center xs:justify-between">
                <PageHeader
                    heading="Market Dates"
                    text={`Manage scheduled market and shopping dates for ${activeGroup.name}`}
                />
            </div>

            <MarketDateList
                marketDates={marketDates as any}
                isManager={isManager}
                currentUserId={session.user.id}
            />
        </div>
    );
}
