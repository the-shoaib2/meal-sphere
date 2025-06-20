"use client"

import { useState } from "react"
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
import { useExtraExpense, type ExtraExpense } from "@/hooks/use-extra-expense"
import { ExpenseActions } from "./expense-actions"

export function ExpenseList() {
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
    await deleteExpense.mutateAsync(expenseId)
  }

  if (!activeGroup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Group Selected</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please select a group to view expenses.</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/15 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <h3 className="text-sm font-medium text-destructive ml-2">
            Error loading expenses
          </h3>
        </div>
        <p className="mt-2 text-sm text-destructive">
          {error.message}
        </p>
      </div>
    )
  }

  const expenseTypes = [
    { value: 'ALL_TYPES', label: 'All Types' },
    { value: 'UTILITY', label: 'Utility' },
    { value: 'RENT', label: 'Rent' },
    { value: 'INTERNET', label: 'Internet' },
    { value: 'CLEANING', label: 'Cleaning' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'OTHER', label: 'Other' },
  ]

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      UTILITY: { variant: 'default', label: 'Utility' },
      RENT: { variant: 'secondary', label: 'Rent' },
      INTERNET: { variant: 'outline', label: 'Internet' },
      CLEANING: { variant: 'outline', label: 'Cleaning' },
      MAINTENANCE: { variant: 'secondary', label: 'Maintenance' },
      OTHER: { variant: 'outline', label: 'Other' },
    }
    const typeInfo = typeMap[type] || { variant: 'outline' as const, label: type }
    return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
  }

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
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

            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
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

            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Expenses</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} • Total: ৳{totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
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
                      <TableCell>৳{expense.amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                      <TableCell>{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="flex items-center space-x-2">
                        {expense.user?.image && (
                          <Image
                            src={expense.user.image}
                            alt={expense.user?.name || 'User'}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        )}
                        <span>{expense.user?.name || 'Unknown'}</span>
                      </TableCell>
                      <TableCell>
                        {expense.receiptUrl ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon">
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
                            onDelete={handleDeleteExpense}
                            isDeleting={deleteMutation.isPending}
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
