"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CreditCard } from "lucide-react"
import Image from "next/image"
import { useIsMobile } from "@/hooks/use-mobile"

interface BkashPaymentProps {
  roomId: string
  roomName: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function BkashPayment({ roomId, roomName, onSuccess, onCancel }: BkashPaymentProps) {
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [bkashURL, setBkashURL] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value)
    }
  }

  const handlePayment = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { createBkashPaymentAction } = await import("@/lib/actions/payment.actions")
      const data = await createBkashPaymentAction(roomId, Number.parseFloat(amount))

      if (data.success) {
        setPaymentId(data.paymentId || null)
        setBkashURL(data.bkashURL || null)
        setPaymentStatus("created")

        // If we're in sandbox mode or there's no bkashURL, we'll simulate the payment
        if (!data.bkashURL) {
          // Poll for payment status
          pollPaymentStatus(data.paymentId!)
        } else {
          // Open bKash payment page in a new window
          window.open(data.bkashURL, "_blank")
          // Start polling for payment status
          pollPaymentStatus(data.paymentId!)
        }
      } else {
        throw new Error(data.error || "Failed to create payment")
      }
    } catch (error: any) {
      console.error("Error creating payment:", error)
      toast({
        title: "Payment failed",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const pollPaymentStatus = async (paymentId: string) => {
    // Poll every 5 seconds for up to 5 minutes
    const maxAttempts = 60
    let attempts = 0

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setPaymentStatus("timeout")
        return
      }

      try {
        const { getBkashPaymentStatusAction } = await import("@/lib/actions/payment.actions")
        const data = await getBkashPaymentStatusAction(paymentId)

        if (data.success) {
          if (data.status === "Completed") {
            setPaymentStatus("completed")
            toast({
              title: "Payment successful",
              description: `Your payment of ৳${data.amount} has been completed successfully.`,
            })
            if (onSuccess) onSuccess()
            return
          } else if (data.status === "Failed") {
            setPaymentStatus("failed")
            toast({
              title: "Payment failed",
              description: "Your payment could not be processed. Please try again.",
              variant: "destructive",
            })
            return
          }
        }
      } catch (error) {
        console.error("Error checking payment status:", error)
      }

      attempts++
      setTimeout(poll, 5000)
    }

    poll()
  }

  const handleExecutePayment = async () => {
    if (!paymentId) return

    setIsLoading(true)

    try {
      const { executeBkashPaymentAction } = await import("@/lib/actions/payment.actions")
      const data = await executeBkashPaymentAction(paymentId)

      if (data.success) {
        if (data.status === "Completed") {
          setPaymentStatus("completed")
          toast({
            title: "Payment successful",
            description: `Your payment has been completed successfully. Transaction ID: ${data.trxId}`,
          })
          if (onSuccess) onSuccess()
        } else {
          setPaymentStatus("failed")
          toast({
            title: "Payment failed",
            description: "Your payment could not be processed. Please try again.",
            variant: "destructive",
          })
        }
      } else {
        throw new Error(data.error || "Failed to execute payment")
      }
    } catch (error: any) {
      console.error("Error executing payment:", error)
      toast({
        title: "Payment failed",
        description: error.message || "Failed to execute payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) onCancel()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Bkash Payment</CardTitle>
            <CardDescription>Pay for meals using Bkash</CardDescription>
          </div>
          <div className="h-10 w-10 relative">
            <Image src="/bkash-logo.png" alt="Bkash Logo" fill style={{ objectFit: "contain" }} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!paymentId ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room">Room</Label>
              <Input id="room" value={roomName} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (৳)</Label>
              <Input id="amount" type="text" placeholder="0.00" value={amount} onChange={handleAmountChange} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentStatus === "created" && (
              <>
                <div className=" p-4 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Your payment has been initiated. Please complete the payment using the Bkash app or website.
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Payment ID: {paymentId}</p>
                  <p className="text-sm text-muted-foreground">Amount: ৳{amount}</p>
                </div>
              </>
            )}
            {paymentStatus === "completed" && (
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-sm text-green-800">
                  Your payment has been completed successfully. Thank you for your payment!
                </p>
              </div>
            )}
            {paymentStatus === "failed" && (
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-sm text-red-800">Your payment could not be processed. Please try again.</p>
              </div>
            )}
            {paymentStatus === "timeout" && (
              <div className=" p-4 rounded-md">
                <p className="text-sm text-yellow-800">
                  We couldn't confirm your payment status. If you completed the payment, it will be reflected in your
                  account soon.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className={`flex ${isMobile ? "flex-col space-y-2" : "justify-between"}`}>
        {!paymentId ? (
          <>
            <Button variant="outline" onClick={handleCancel} className={isMobile ? "w-full" : ""}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={isLoading} className={isMobile ? "w-full" : ""}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay with Bkash
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            {paymentStatus === "created" && (
              <Button variant="outline" onClick={handleCancel} className="w-full">
                Check Later
              </Button>
            )}
            {(paymentStatus === "completed" || paymentStatus === "failed" || paymentStatus === "timeout") && (
              <Button onClick={handleCancel} className="w-full">
                Done
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  )
}
