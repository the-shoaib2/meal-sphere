"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ExpenseList } from "@/components/expense-list"
import { ExtraExpenseDialog } from "@/components/extra-expense-dialog"
import { useActiveGroup } from "@/contexts/group-context"
import { toast } from "react-hot-toast"
import { Plus } from "lucide-react"

export default function ExpensesPage() {
  const { activeGroup } = useActiveGroup()

  if (!activeGroup) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <h1 className="text-3xl font-bold">Extra Expenses</h1>
        <p className="text-muted-foreground">Please select a group to view expenses.</p>
      </div>
    )
  }

  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Extra Expenses</h1>
          <p className="text-muted-foreground">
            Track additional expenses like utilities, rent, internet, and more for {activeGroup.name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setOpen(true)}
            className="gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>
      
      <ExtraExpenseDialog 
        open={open} 
        onOpenChange={setOpen} 
        onSuccess={handleSuccess}
      />

      <ExpenseList />
    </div>
  )
}
