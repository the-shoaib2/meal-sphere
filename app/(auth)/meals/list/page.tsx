import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';
import { fetchGroupAccessData } from '@/lib/services/groups-service';
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from '@/components/ui/badge';
import MealListView from '@/components/meal/meal-list-view';


export default async function MealListPage({ searchParams }: { searchParams: Promise<any> }) {
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
        redirect('/meals');
    }

    // 2. Fetch Access Data
    const accessData = await fetchGroupAccessData(activeGroup.id, session.user.id);
    const userRole = accessData.userRole;

    // 3. Security: Only ADMIN can access this page
    if (userRole !== 'ADMIN') {
        redirect('/meals');
    }

    // 4. Resolve date from search params
    const dateParam = resolvedSearchParams?.date ? new Date(resolvedSearchParams.date) : new Date();

    // 5. Fetch initial data for SSR hydration to avoid stale client cache
    const initialData = await import('@/lib/services/meals-service').then(m =>
        m.fetchMealsData(session.user.id, activeGroup.id, { date: dateParam })
    );

    return (
        <div className="space-y-2">
            <PageHeader
                heading="Meal List"
                showBackButton
                backHref="/meals"
                description={
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                        <span className="text-muted-foreground/90 font-medium text-sm">
                            Detailed meal view for <span className="text-foreground font-semibold">{activeGroup.name}</span>
                        </span>
                        <Badge
                            variant="outline"
                            className="bg-red-50 text-red-600 border-red-200/60 shadow-sm uppercase tracking-widest text-[10px] font-bold px-2 py-0.5 flex items-center gap-1.5 shrink-0"
                        >
                            <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                            ADMIN
                        </Badge>
                    </div>
                }
            />

            <MealListView
                roomId={activeGroup.id}
                selectedDate={dateParam}
                userRole={userRole}
                initialData={initialData}
            />
        </div>
    );
}
