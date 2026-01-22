import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/services/prisma';
import { redirect } from 'next/navigation';
import { fetchPaymentsData } from '@/lib/services/payments-service';
import { fetchGroupAccessData } from '@/lib/services/groups-service';
import { PaymentManagement } from "@/components/payments/payment-management";
import { NoGroupState } from "@/components/empty-states/no-group-state";
import { NoPeriodState } from "@/components/empty-states/no-period-state";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
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
                    heading="Payments"
                    text="Track and manage group payments"
                />
                <NoGroupState />
            </div>
        );
    }

    // 2. Fetch Initial Data for the active group
    const [paymentsData, accessData] = await Promise.all([
        fetchPaymentsData(session.user.id, activeGroup.id),
        fetchGroupAccessData(activeGroup.id, session.user.id)
    ]);

    // 3. Handle No Period State server-side
    if (!paymentsData.currentPeriod) {
        const isPrivileged = ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(accessData.userRole || '');
        return (
            <div className="space-y-6">
                <PageHeader
                    heading="Payments"
                    text={`Track and manage payments for ${activeGroup.name}`}
                />
                <NoPeriodState
                    isPrivileged={isPrivileged}
                    periodMode={paymentsData.roomData?.periodMode || 'MONTHLY'}
                />
            </div>
        );
    }

    // 4. Render client component with initial data
    return (
        <div className="space-y-6">
            <PaymentManagement
                initialData={{
                    ...paymentsData,
                    groupId: activeGroup.id
                }}
                initialAccessData={accessData}
            />
        </div>
    );
}
