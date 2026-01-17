"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
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
import { CreditCard, Download, Plus } from "lucide-react"
import BkashPayment from "./bkash-payment"
import { useIsMobile } from "@/hooks/use-mobile"
import { ResponsiveTable } from "../ui/responsive-table"
import { format } from "date-fns"

export default function PaymentHistory() {
  const [selectedRoom, setSelectedRoom] = useState("all")
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showBkashDialog, setShowBkashDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("bkash")
  const isMobile = useIsMobile()

  // Sample data - would come from API
  const payments = [
    {
      id: "pay-1",
      date: "2024-05-20",
      amount: 2500,
      method: "Bkash",
      status: "completed",
      room: "Apartment 303",
      description: "Monthly meal payment",
    },
    {
      id: "pay-2",
      date: "2024-04-15",
      amount: 2200,
      method: "Bkash",
      status: "completed",
      room: "Apartment 303",
      description: "Monthly meal payment",
    },
    {
      id: "pay-3",
      date: "2024-05-18",
      amount: 1500,
      method: "Cash",
      status: "completed",
      room: "Hostel Block B",
      description: "Partial payment",
    },
    {
      id: "pay-4",
      date: "2024-05-10",
      amount: 1000,
      method: "Bkash",
      status: "completed",
      room: "Hostel Block B",
      description: "Advance payment",
    },
    {
      id: "pay-5",
      date: "2024-03-25",
      amount: 2300,
      method: "Bkash",
      status: "completed",
      room: "Apartment 303",
      description: "Monthly meal payment",
    },
  ]

  const filteredPayments =
    selectedRoom === "all"
      ? payments
      : payments.filter((payment) => payment.room === (selectedRoom === "room-1" ? "Apartment 303" : "Hostel Block B"))

  const handlePaymentSuccess = () => {
    setShowBkashDialog(false)
    // Refresh payments data
  }

  const columns = [
    { key: "date", title: "Date", render: (value: string) => format(new Date(value), "PPP") },
    { key: "amount", title: "Amount", render: (value: number) => `৳${value}` },
    { key: "method", title: "Method", render: (value: string) => value },
    { key: "room", title: "Room", render: (value: string) => value },
    { key: "description", title: "Description", render: (value: string) => value },
    {
      key: "status",
      title: "Status",
      render: (value: string) => (
        <Badge variant={value === "COMPLETED" ? "default" : "secondary"}>
          {value}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payment History</h2>
          <p className="text-muted-foreground">Track and manage your meal payments</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select Room" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              <SelectItem value="room-1">Apartment 303</SelectItem>
              <SelectItem value="room-2">Hostel Block B</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Payment</DialogTitle>
                <DialogDescription>Record a new payment for your meal expenses</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount (৳)</Label>
                  <Input id="amount" type="number" placeholder="0.00" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select defaultValue={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="payment-method">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bkash">Bkash</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="room">Room</Label>
                  <Select defaultValue="room-1">
                    <SelectTrigger id="room">
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="room-1">Apartment 303</SelectItem>
                      <SelectItem value="room-2">Hostel Block B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" placeholder="Payment description" />
                </div>
              </div>
              <DialogFooter className={isMobile ? "flex-col space-y-2" : ""}>
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  className={isMobile ? "w-full" : ""}
                >
                  Cancel
                </Button>
                {paymentMethod === "bkash" ? (
                  <Button
                    onClick={() => {
                      setShowPaymentDialog(false)
                      setShowBkashDialog(true)
                    }}
                    className={isMobile ? "w-full" : ""}
                  >
                    Pay with Bkash
                  </Button>
                ) : (
                  <Button onClick={() => setShowPaymentDialog(false)} className={isMobile ? "w-full" : ""}>
                    Add Payment
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showBkashDialog} onOpenChange={setShowBkashDialog}>
            <DialogContent className="sm:max-w-md">
              <BkashPayment
                roomId="room-1"
                roomName="Apartment 303"
                onSuccess={handlePaymentSuccess}
                onCancel={() => setShowBkashDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
          <CardDescription>Your payment statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="flex flex-col items-center justify-center rounded-lg border p-4">
              <div className="text-2xl font-bold">৳9,500</div>
              <p className="text-xs text-muted-foreground">Total Paid</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border p-4">
              <div className="text-2xl font-bold">৳2,950</div>
              <p className="text-xs text-muted-foreground">Current Balance</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border p-4">
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">Total Transactions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Your payment history</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <ResponsiveTable columns={columns} data={filteredPayments} emptyMessage="No payment history found" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Manage your payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Bkash</p>
                  <p className="text-sm text-muted-foreground">**** **** **** 1234</p>
                </div>
              </div>
              <Badge>Default</Badge>
            </div>
            <Button variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Payment Method
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
