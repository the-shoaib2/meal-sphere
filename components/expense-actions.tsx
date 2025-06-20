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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
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
