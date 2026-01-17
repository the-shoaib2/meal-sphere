"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, startOfMonth } from "date-fns"
import { CalendarIcon, FileText, Eye, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "react-hot-toast"
import { useLanguage } from "@/contexts/language-context"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
// AlertDialog related components are now handled in ExpenseActions component
import Image from "next/image"
import { useActiveGroup } from "@/contexts/group-context"
import { useSession } from "next-auth/react"
import { useExtraExpense, type ExtraExpense } from "@/hooks/use-expense"
import { ExpenseActions } from "@/components/finance/expense-actions"
import { Skeleton } from "@/components/ui/skeleton"

export function ExpenseList() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const { activeGroup } = useActiveGroup()
  const [selectedType, setSelectedType] = useState<string>("")
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const { expenses = [], isLoading, error, deleteExpense } = useExtraExpense()
  const deleteMutation = deleteExpense as { isPending: boolean, mutateAsync: (id: string) => Promise<any> }
  const [selectedExpense, setSelectedExpense] = useState<ExtraExpense | null>(null)
  const { t } = useLanguage()

  const currentUserRole = activeGroup?.members?.find(
    member => member.userId === session?.user?.id
  )?.role || 'MEMBER'

  const canManageExpenses = ['ADMIN', 'MANAGER', 'MEAL_MANAGER'].includes(currentUserRole)


  const filteredExpenses = expenses.filter(expense => {
    try {
      const expenseDate = expense.date ? new Date(expense.date) : null
      if (!expenseDate || isNaN(expenseDate.getTime())) return false

      const matchesType = selectedType === 'ALL_TYPES' || !selectedType || expense.type === selectedType
      const matchesDate = expenseDate >= startDate && expenseDate <= endDate
      return matchesType && matchesDate
    } catch (error) {
      console.error('Error processing expense:', expense.id, error)
      return false
    }
  })

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await deleteExpense.mutateAsync(expenseId)
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  const handleEditSuccess = () => {
    // Invalidate the expenses query to trigger a refetch
    queryClient.invalidateQueries({
      queryKey: ['extraExpenses', activeGroup?.id]
    })
  }



  if (isLoading || !activeGroup) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Filters Card Skeleton */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                <Skeleton className="h-9 sm:h-10 w-full" />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                <Skeleton className="h-9 sm:h-10 w-full" />
              </div>
              <div className="space-y-1.5 sm:space-y-2 sm:col-span-2 lg:col-span-1">
                <Skeleton className="h-3 sm:h-4 w-10 sm:w-12" />
                <Skeleton className="h-9 sm:h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table Skeleton */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3 sm:pb-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Skeleton className="h-4 sm:h-5 w-16 sm:w-20" />
                <Skeleton className="h-4 sm:h-5 w-20 sm:w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <div className="p-3 sm:p-4">
                <div className="space-y-3 sm:space-y-4">
                  {/* Table Header Skeleton - Desktop */}
                  <div className="hidden sm:grid sm:grid-cols-7 gap-3 sm:gap-4 pb-2 border-b">
                    <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                    <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                    <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                    <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                    <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                    <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                    <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                  </div>

                  {/* Mobile Header Skeleton */}
                  <div className="sm:hidden pb-2 border-b">
                    <Skeleton className="h-4 w-24" />
                  </div>

                  {/* Table Rows Skeleton - Desktop */}
                  <div className="hidden sm:block">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="grid grid-cols-7 gap-3 sm:gap-4 py-2 sm:py-3 border-b last:border-b-0">
                        <Skeleton className="h-4 w-24 sm:w-32" />
                        <Skeleton className="h-5 sm:h-6 w-12 sm:w-16 rounded-full" />
                        <Skeleton className="h-4 w-16 sm:w-20" />
                        <Skeleton className="h-4 w-20 sm:w-24" />
                        <div className="flex items-center space-x-1.5 sm:space-x-2">
                          <Skeleton className="h-5 w-5 sm:h-6 sm:w-6 rounded-full" />
                          <Skeleton className="h-4 w-16 sm:w-20" />
                        </div>
                        <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded" />
                        <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded" />
                      </div>
                    ))}
                  </div>

                  {/* Mobile Rows Skeleton */}
                  <div className="sm:hidden space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-2 p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-5 w-5 rounded-full" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                          <div className="flex items-center space-x-1">
                            <Skeleton className="h-7 w-7 rounded" />
                            <Skeleton className="h-7 w-7 rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }


  const expenseTypes = [
    { value: 'ALL_TYPES', label: 'All Types' },
    { value: 'FOOD', label: 'Food' },
    { value: 'UTILITY', label: 'Utility' },
    { value: 'RENT', label: 'Rent' },
    { value: 'INTERNET', label: 'Internet' },
    { value: 'CLEANING', label: 'Cleaning' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'DAILY_EXPENSE', label: 'Daily Expense' },
    { value: 'OTHER', label: 'Other' },
  ]

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      FOOD: { variant: 'default', label: 'Food' },
      UTILITY: { variant: 'default', label: 'Utility' },
      RENT: { variant: 'secondary', label: 'Rent' },
      INTERNET: { variant: 'outline', label: 'Internet' },
      CLEANING: { variant: 'outline', label: 'Cleaning' },
      MAINTENANCE: { variant: 'secondary', label: 'Maintenance' },
      DAILY_EXPENSE: { variant: 'outline', label: 'Daily Expense' },
      OTHER: { variant: 'outline', label: 'Other' },
    }
    const typeInfo = typeMap[type] || { variant: 'outline' as const, label: type }
    return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
  }

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Expense Type</label>
              <Select value={selectedType || 'ALL_TYPES'} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">Expenses</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
              </span>
              <Badge className="text-sm font-medium">
                Total: ৳{expenses
                  .reduce((sum, exp) => sum + exp.amount, 0)
                  .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">No expenses found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by adding a new expense.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead>Receipt</TableHead>
                    {canManageExpenses && <TableHead className="w-[50px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>{getTypeBadge(expense.type)}</TableCell>
                      <TableCell className="text-red-600" >৳ -{expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="flex items-center space-x-2">
                        {expense.user?.image && (
                          <Image
                            src={expense.user.image}
                            alt={expense.user?.name || 'User'}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        )}
                        <span className="text-sm">{expense.user?.name || 'Unknown'}</span>
                      </TableCell>
                      <TableCell>
                        {expense.receiptUrl ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <div className="relative aspect-video">
                                <Image
                                  src={expense.receiptUrl}
                                  alt="Receipt"
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      {canManageExpenses && (
                        <TableCell>
                          <ExpenseActions
                            expenseId={expense.id}
                            expense={expense}
                            onDelete={handleDeleteExpense}
                            isDeleting={deleteExpense.isPending}
                            onSuccess={handleEditSuccess}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
