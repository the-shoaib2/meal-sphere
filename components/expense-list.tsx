"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, FileText, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "react-hot-toast"
import { useLanguage } from "@/contexts/language-context"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import Image from "next/image"
import type { Room, User } from "@prisma/client"

interface ExpenseListProps {
  user: User
  rooms: Room[]
}

export function ExpenseList({ user, rooms }: ExpenseListProps) {
  const [selectedRoom, setSelectedRoom] = useState<string>("")
  const [selectedType, setSelectedType] = useState<string>("")
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(1)))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [expenses, setExpenses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoom) {
      setSelectedRoom(rooms[0].id)
    }
  }, [rooms, selectedRoom])

  useEffect(() => {
    if (selectedRoom) {
      fetchExpenses()
    }
  }, [selectedRoom, selectedType, startDate, endDate])

  async function fetchExpenses() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        roomId: selectedRoom,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })

      if (selectedType) {
        params.append("type", selectedType)
      }

      const response = await fetch(`/api/expenses?${params.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to fetch expenses")
      }

      const data = await response.json()
      setExpenses(data)
    } catch (error) {
      console.error(error)
      toast.error("Failed to fetch expenses")
    } finally {
      setIsLoading(false)
    }
  }

  function getExpenseTypeBadge(type: string) {
    const typeColors: Record<string, string> = {
      UTILITY: "bg-blue-100 text-blue-800",
      RENT: "bg-purple-100 text-purple-800",
      INTERNET: "bg-green-100 text-green-800",
      CLEANING: "bg-yellow-100 text-yellow-800",
      MAINTENANCE: "bg-orange-100 text-orange-800",
      OTHER: "bg-gray-100 text-gray-800",
    }

    const typeLabels: Record<string, string> = {
      UTILITY: t("expense.utility"),
      RENT: t("expense.rent"),
      INTERNET: t("expense.internet"),
      CLEANING: t("expense.cleaning"),
      MAINTENANCE: t("expense.maintenance"),
      OTHER: t("expense.other"),
    }

    return <Badge className={typeColors[type] || "bg-gray-100 text-gray-800"}>{typeLabels[type] || type}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="w-full md:w-1/4">
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger>
                <SelectValue placeholder="Select a room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-1/4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="All expense types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="UTILITY">{t("expense.utility")}</SelectItem>
                <SelectItem value="RENT">{t("expense.rent")}</SelectItem>
                <SelectItem value="INTERNET">{t("expense.internet")}</SelectItem>
                <SelectItem value="CLEANING">{t("expense.cleaning")}</SelectItem>
                <SelectItem value="MAINTENANCE">{t("expense.maintenance")}</SelectItem>
                <SelectItem value="OTHER">{t("expense.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-1/4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="w-full md:w-1/4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>End date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No expenses found for the selected criteria.</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.date), "PPP")}</TableCell>
                    <TableCell>{getExpenseTypeBadge(expense.type)}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{expense.amount.toFixed(2)}</TableCell>
                    <TableCell>{expense.user.name}</TableCell>
                    <TableCell>
                      {expense.receiptUrl ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Receipt</DialogTitle>
                            </DialogHeader>
                            <div className="relative h-[60vh] w-full">
                              {expense.receiptUrl.endsWith(".pdf") ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                  <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                                  <a
                                    href={expense.receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Open PDF in new tab
                                  </a>
                                </div>
                              ) : (
                                <Image
                                  src={expense.receiptUrl || "/placeholder.svg"}
                                  alt="Receipt"
                                  fill
                                  className="object-contain"
                                />
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
