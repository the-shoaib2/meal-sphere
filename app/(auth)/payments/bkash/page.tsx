"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import BkashPayment from "@/components/bkash-payment"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, ArrowLeft } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function BkashPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedRoom, setSelectedRoom] = useState("")
  const [roomName, setRoomName] = useState("")
  const [showPayment, setShowPayment] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sample data - would come from API
  const rooms = [
    { id: "room-1", name: "Apartment 303" },
    { id: "room-2", name: "Hostel Block B" },
  ]

  useEffect(() => {
    // Check for success or error in URL params
    const successParam = searchParams.get("success")
    const errorParam = searchParams.get("error")

    if (successParam === "true") {
      setSuccess(true)
    } else if (errorParam) {
      setError(
        errorParam === "payment-failed"
          ? "Your payment could not be processed. Please try again."
          : "An error occurred while processing your payment.",
      )
    }
  }, [searchParams])

  const handleRoomChange = (value: string) => {
    setSelectedRoom(value)
    const room = rooms.find((r) => r.id === value)
    if (room) {
      setRoomName(room.name)
    }
  }

  const handleContinue = () => {
    if (selectedRoom) {
      setShowPayment(true)
    }
  }

  const handlePaymentSuccess = () => {
    setSuccess(true)
    setShowPayment(false)
  }

  const handleBack = () => {
    router.push("/dashboard/payments")
  }

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" onClick={handleBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Payments
      </Button>

      {success ? (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Payment Successful</AlertTitle>
          <AlertDescription className="text-green-700">
            Your payment has been processed successfully. Thank you for your payment!
          </AlertDescription>
        </Alert>
      ) : error ? (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Payment Failed</AlertTitle>
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      ) : null}

      {!showPayment && !success ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Bkash Payment</CardTitle>
            <CardDescription>Select a room to make a payment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="room" className="text-sm font-medium">
                Room
              </label>
              <Select value={selectedRoom} onValueChange={handleRoomChange}>
                <SelectTrigger id="room">
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
            <Button onClick={handleContinue} disabled={!selectedRoom} className="w-full">
              Continue
            </Button>
          </CardContent>
        </Card>
      ) : showPayment ? (
        <BkashPayment
          roomId={selectedRoom}
          roomName={roomName}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPayment(false)}
        />
      ) : (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Payment Completed</CardTitle>
            <CardDescription>Your payment has been processed successfully</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleBack} className="w-full">
              Return to Payments
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
