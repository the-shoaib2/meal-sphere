"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, MoreHorizontal, Pencil } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "react-hot-toast"
import { Loader2 } from "lucide-react"
import { ExtraExpenseDialog } from "./extra-expense-dialog"
import { type ExtraExpense } from "@/hooks/use-extra-expense"
import { Skeleton } from "@/components/ui/skeleton"

interface ExpenseActionsProps {
  expenseId: string
  expense: ExtraExpense
  onDelete: (id: string) => Promise<void>
  isDeleting: boolean
  onSuccess?: () => void
}

export function ExpenseActions({ expenseId, expense, onDelete, isDeleting, onSuccess }: ExpenseActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    try {
      await onDelete(expenseId)
      toast.success('Expense deleted successfully')
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Failed to delete expense')
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }

  // Show skeleton while deleting
  if (isDeleting) {
    return (
      <div className="flex items-center justify-center">
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            className="cursor-pointer flex items-center gap-2"
            onClick={() => {
              setIsEditDialogOpen(true)
            }}
          >
            <Pencil className="h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="cursor-pointer text-destructive focus:text-destructive flex items-center gap-2"
            onClick={handleDeleteClick}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[350px] w-[calc(100%-2rem)] mx-auto rounded-lg">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-lg">Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This action cannot be undone. The expense will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel 
              className="w-full sm:w-auto mt-0" 
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Expense
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isEditDialogOpen && (
        <ExtraExpenseDialog 
          open={isEditDialogOpen} 
          onOpenChange={setIsEditDialogOpen}
          expense={expense}
          onSuccess={() => {
            setIsEditDialogOpen(false)
            onSuccess?.()
          }}
        />
      )}
    </>
  )
}
