"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ExpenseList } from "@/components/finance/expense-list"
import { ExtraExpenseDialog } from "@/components/finance/extra-expense-dialog"
import { Plus } from "lucide-react"
import { useCurrentPeriod } from "@/hooks/use-periods"
import PeriodNotFoundCard from "@/components/periods/period-not-found-card"
import { useSession } from "next-auth/react"
import { type ExpensesPageData } from "@/hooks/use-expense"
import { useGroupAccess } from "@/hooks/use-group-access"
import { PageHeader } from "@/components/shared/page-header"

interface ExpensesPageContentProps {
    activeGroup: any;
    userRole: string | null;
    initialData: ExpensesPageData;
    initialAccessData?: any;
}

export function ExpensesPageContent({ activeGroup, userRole: propUserRole, initialData, initialAccessData }: ExpensesPageContentProps) {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false)
    const { userRole: userRoleFromHook } = useGroupAccess({
        groupId: activeGroup?.id,
        initialData: initialAccessData
    })
    const userRole = propUserRole || userRoleFromHook;
    const { data: currentPeriodFromHook, isLoading: isPeriodLoading } = useCurrentPeriod()

    const currentPeriod = initialData.currentPeriod || currentPeriodFromHook;

    const handleSuccess = () => {
        setOpen(false);
    };

    return (
        <div className="space-y-4">
            <PageHeader
                heading="Extra Expenses"
                description={`Track additional expenses like utilities, rent, internet, and more for ${activeGroup?.name}.`}
            >
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setOpen(true)}
                        size="sm"
                        className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Expense
                    </Button>
                </div>
            </PageHeader>
            <ExtraExpenseDialog open={open} onOpenChange={setOpen} onSuccess={handleSuccess} />

            <ExpenseList initialData={initialData} />
        </div>
    )
}
