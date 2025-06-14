"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon, Download, Plus, ShoppingBag } from "lucide-react"
import { formatCurrency } from "@/lib/meal-calculations"

export default function ShoppingManagement() {
  const [selectedRoom, setSelectedRoom] = useState("room-1")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")

  // Sample data - would come from API
  const rooms = [
    { id: "room-1", name: "Apartment 303" },
    { id: "room-2", name: "Hostel Block B" },
  ]

  // Sample shopping data - would come from API
  const shoppingItems = [
    {
      id: "item-1",
      date: "2024-05-20",
      description: "Rice (10kg)",
      amount: 850,
      addedBy: "John Doe",
    },
    {
      id: "item-2",
      date: "2024-05-18",
      description: "Vegetables",
      amount: 450,
      addedBy: "Jane Smith",
    },
    {
      id: "item-3",
      date: "2024-05-15",
      description: "Chicken (5kg)",
      amount: 1200,
      addedBy: "John Doe",
    },
    {
      id: "item-4",
      date: "2024-05-12",
      description: "Cooking Oil (5L)",
      amount: 950,
      addedBy: "Bob Johnson",
    },
    {
      id: "item-5",
      date: "2024-05-10",
      description: "Spices and Condiments",
      amount: 650,
      addedBy: "John Doe",
    },
  ]

  const handleAddShoppingItem = async () => {
    // This would be replaced with an actual API call
    console.log({
      roomId: selectedRoom,
      date: selectedDate,
      description,
      amount: Number.parseFloat(amount),
    })

    // Reset form
    setDescription("")
    setAmount("")
    setSelectedDate(new Date())
    setShowAddDialog(false)
  }

  const totalAmount = shoppingItems.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Shopping Management</h2>
          <p className="text-muted-foreground">Track and manage shopping expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Room" />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Shopping
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Shopping Item</DialogTitle>
                <DialogDescription>Add a new shopping expense to the room</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button id="date" variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Rice, Vegetables, etc."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount (৳)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddShoppingItem}>Add Item</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Shopping List</CardTitle>
            <CardDescription>Recent shopping expenses</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border mb-6">
            <div className="flex items-center p-4">
              <div className="rounded-full bg-primary/10 p-2 mr-4">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Shopping Cost</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Added By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shoppingItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.addedBy}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
