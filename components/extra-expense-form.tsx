"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { Room, User } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "react-hot-toast"
import { useLanguage } from "@/contexts/language-context"
import Image from "next/image"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const expenseFormSchema = z.object({
  roomId: z.string({
    required_error: "Please select a room",
  }),
  description: z.string().min(3, {
    message: "Description must be at least 3 characters.",
  }),
  amount: z.coerce.number().positive({
    message: "Amount must be a positive number.",
  }),
  date: z.date({
    required_error: "Please select a date",
  }),
  type: z.enum(["UTILITY", "RENT", "INTERNET", "CLEANING", "MAINTENANCE", "OTHER"], {
    required_error: "Please select an expense type",
  }),
  receipt: z
    .instanceof(FileList)
    .optional()
    .refine((files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, {
      message: `Max file size is 5MB.`,
    })
    .transform((files) => (files && files.length > 0 ? files[0] : undefined)),
})

type ExpenseFormValues = z.infer<typeof expenseFormSchema>

interface ExtraExpenseFormProps {
  user: User
  rooms: Room[]
}

export function ExtraExpenseForm({ user, rooms }: ExtraExpenseFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const { t } = useLanguage()

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
      // Create a preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  async function onSubmit(data: ExpenseFormValues) {
    setIsLoading(true)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append("roomId", data.roomId)
      formData.append("description", data.description)
      formData.append("amount", data.amount.toString())
      formData.append("date", data.date.toISOString())
      formData.append("type", data.type)

      if (data.receipt) {
        formData.append("receipt", data.receipt)
      }

      const response = await fetch("/api/expenses", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to add expense")
      }

      toast.success("Expense added successfully")
      form.reset({
        roomId: data.roomId,
        description: "",
        amount: 0,
        date: new Date(),
        type: "OTHER",
      })
      setPreviewUrl(null)
      router.refresh()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to add expense")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("expense.add")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("meals.room")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a room" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("expense.type")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select expense type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UTILITY">{t("expense.utility")}</SelectItem>
                      <SelectItem value="RENT">{t("expense.rent")}</SelectItem>
                      <SelectItem value="INTERNET">{t("expense.internet")}</SelectItem>
                      <SelectItem value="CLEANING">{t("expense.cleaning")}</SelectItem>
                      <SelectItem value="MAINTENANCE">{t("expense.maintenance")}</SelectItem>
                      <SelectItem value="OTHER">{t("expense.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("expense.description")}</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("expense.amount")}</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={0.01} placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("expense.date")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
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
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>{t("expense.receipt")}</FormLabel>
                  <FormControl>
                    <div className="grid w-full gap-2">
                      <Input
                        id="receipt"
                        type="file"
                        accept="image/*,.pdf"
                        className="cursor-pointer"
                        onChange={(e) => {
                          onChange(e.target.files)
                          handleFileChange(e)
                        }}
                        {...fieldProps}
                      />
                      {previewUrl && (
                        <div className="relative h-40 w-full overflow-hidden rounded-md">
                          <Image
                            src={previewUrl || "/placeholder.svg"}
                            alt="Receipt preview"
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>{t("shopping.uploadReceipt")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : t("button.add")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
