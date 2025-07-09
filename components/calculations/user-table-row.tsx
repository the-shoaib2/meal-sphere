"use client"

import { useMemo, memo } from "react"
import { TableCell, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/meal-calculations"

interface UserTableRowProps {
  user: any
}

// Memoized table row component
const UserTableRow = memo(({ user }: UserTableRowProps) => {
  const userInitials = useMemo(() => {
    return user.userName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
  }, [user.userName])

  const balanceClass = useMemo(() => {
    return user.balance >= 0 ? "text-green-600" : "text-red-600"
  }, [user.balance])

  const badgeVariant = useMemo(() => {
    return user.balance >= 0 ? "default" : "destructive"
  }, [user.balance])

  const badgeText = useMemo(() => {
    return user.balance >= 0 ? "Paid" : "Due"
  }, [user.balance])

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.userImage || "/placeholder.svg"} alt={user.userName} />
            <AvatarFallback className="text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm">{user.userName}</div>
        </div>
      </TableCell>
      <TableCell className="text-right text-sm">{user.mealCount}</TableCell>
      <TableCell className="text-right text-sm">{formatCurrency(user.cost)}</TableCell>
      <TableCell className="text-right text-sm">{formatCurrency(user.paid)}</TableCell>
      <TableCell className="text-right font-medium text-sm">
        <span className={balanceClass}>
          {formatCurrency(user.balance)}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant={badgeVariant} className="text-xs">
          {badgeText}
        </Badge>
      </TableCell>
    </TableRow>
  )
})

UserTableRow.displayName = "UserTableRow"

export default UserTableRow 