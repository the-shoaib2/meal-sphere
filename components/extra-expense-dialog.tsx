"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "react-hot-toast"
import { useExtraExpense, type ExtraExpense } from "@/hooks/use-extra-expense"
import { Loader2 } from "lucide-react"
import { ExpenseType } from "@prisma/client"
import { Skeleton } from "@/components/ui/skeleton"


interface ExtraExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: ExtraExpense
  onSuccess?: () => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const expenseFormSchema = z.object({
  description: z.string().min(3, {
    message: "Description must be at least 3 characters.",
  }),
  amount: z.coerce.number().positive({
    message: "Amount must be a positive number.",
  }),
  date: z.date({
    required_error: "Please select a date",
  }),
  type: z.nativeEnum(ExpenseType, {
    required_error: "Please select an expense type",
  }),
  receipt: z
    .any()
    .optional()
    .refine((files) => {
      if (!files) return true;
      if (typeof File !== 'undefined' && files instanceof FileList) {
        return files.length === 0 || files[0].size <= MAX_FILE_SIZE;
      }
      if (typeof File !== 'undefined' && files instanceof File) {
        return files.size <= MAX_FILE_SIZE;
      }
      return true;
    }, {
      message: `Max file size is 5MB.`,
    })
    .transform((files) => {
      if (!files) return undefined;
      if (typeof File !== 'undefined' && files instanceof FileList) {
        return files.length > 0 ? files[0] : undefined;
      }
      if (typeof File !== 'undefined' && files instanceof File) {
        return files;
      }
      return undefined;
    }),
})

type ExpenseFormValues = z.infer<typeof expenseFormSchema> & {
  receipt?: File | undefined;
}

export function ExtraExpenseDialog({ open, onOpenChange, expense, onSuccess }: ExtraExpenseDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const isEditMode = !!expense
  const { addExpense, updateExpense } = useExtraExpense()

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "",
      amount: 0,
      date: new Date(),
      type: "OTHER",
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      form.setValue('receipt', file, { shouldValidate: true })
    } else {
      setPreviewUrl(null)
      form.setValue('receipt', undefined, { shouldValidate: true })
    }
  }

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // Reset form when dialog opens/closes or when expense changes
  useEffect(() => {
    if (open) {
      form.reset({
        description: expense?.description || "",
        amount: expense?.amount || 0,
        date: expense?.date ? new Date(expense.date) : new Date(),
        type: (expense?.type as any) || "OTHER",
        receipt: undefined,
      })
      setPreviewUrl(expense?.receiptUrl || null)
    } else {
      form.reset()
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
    }
  }, [open, expense, form])

  const onSubmit = async (data: ExpenseFormValues) => {
    try {
      const { receipt, ...expenseData } = data;
      
      if (isEditMode && expense) {
        // For update, convert date to ISO string
        await updateExpense.mutateAsync({
          id: expense.id,
          ...expenseData,
          date: expenseData.date.toISOString(),
          receipt: receipt as File | undefined,
        });
        toast.success("Expense updated successfully!");
      } else {
        // For new expense, keep date as Date object
        await addExpense.mutateAsync({
          ...expenseData,
          receipt: receipt as File | undefined,
        });
        toast.success("Expense added successfully!");
      }
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Failed to save expense. Please try again.");
    }
  }

  const isLoading = isEditMode ? updateExpense.isPending : addExpense.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] w-[calc(100%-2rem)] mx-auto sm:w-full rounded-lg sm:rounded-lg">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl sm:text-2xl">
            {isEditMode ? 'Edit Expense' : 'Add New Expense'}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {isEditMode ? 'Update the expense details below.' : 'Fill out the form to add a new expense.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-3 sm:gap-4 py-2 sm:py-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="What was this expense for?" 
                        {...field} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">৳</span>
                          <Input 
                          type="number" 
                        step="0.01" 
                          min="0"
                        placeholder="0.00" 
                          className="pl-8"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                          }}
                          disabled={isLoading}
                        />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />



                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(ExpenseType).map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal h-10 sm:h-auto",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 sm:max-w-[320px]" align="start" side="bottom">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receipt"
                render={() => (
                  <FormItem>
                    <FormLabel>Receipt (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        onClick={(e) => {
                          // Allow selecting the same file again
                          const element = e.target as HTMLInputElement;
                          element.value = '';
                        }}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Upload a receipt or invoice (max 5MB).
                    </FormDescription>
                    <FormMessage />
                    {previewUrl && (
                      <div className="mt-2">
                          <img
                            src={previewUrl}
                            alt="Receipt preview"
                            className="max-h-48 w-auto max-w-full rounded-md object-contain"
                          />
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
              <Button 
                type="submit"
                className="w-full sm:w-auto"
                disabled={isLoading}
                size="lg"
              >
                {isEditMode ? (
                  isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : 'Update Expense'
                ) : isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
