"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ExpenseList } from "@/components/expense-list"
import { ExtraExpenseDialog } from "@/components/extra-expense-dialog"
import { useActiveGroup } from "@/contexts/group-context"
import { Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentPeriod } from "@/hooks/use-periods"
import PeriodNotFoundCard from "@/components/periods/period-not-found-card"
import { useSession } from "next-auth/react"

export default function ExpensesPage() {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup()
  const [open, setOpen] = useState(false)
  const { data: currentPeriod, isLoading: isPeriodLoading } = useCurrentPeriod()
  const userRole = activeGroup?.members?.find(m => m.userId === session?.user?.id)?.role

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">Extra Expenses</h1>
          <p className="text-muted-foreground text-sm">
            Track additional expenses like utilities, rent, internet, and more for {activeGroup?.name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setOpen(true)}
            size="sm"
            className="gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>
      <ExtraExpenseDialog open={open} onOpenChange={setOpen} onSuccess={handleSuccess} />
      {/* Show PeriodNotFoundCard if no period */}
      {!currentPeriod && !isPeriodLoading ? (
        <PeriodNotFoundCard
          userRole={userRole}
          isLoading={isPeriodLoading}
          groupId={activeGroup?.id}
          userId={session?.user?.id}
        />
      ) : (
        <ExpenseList />
      )}
    </div>
  )
}
