"use client"

import { Suspense } from "react"
import AccountBalancePanel from '@/components/account-balance'
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function AccountBalancePage() {
  return (
    <Suspense fallback={<AccountBalanceLoading />}> 
      <AccountBalancePanel />
    </Suspense>
  )
}

function AccountBalanceLoading() {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    </div>
  )
}
