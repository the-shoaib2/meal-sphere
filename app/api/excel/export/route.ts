import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { exportMealsToExcel, exportShoppingToExcel, exportPaymentsToExcel, generateMealPreviewTable, exportExpensesToExcel, exportBalancesToExcel, generateBalancePreview, generateCalculationPreview } from "@/lib/excel-utils"
import { getExcelPermissions, validateExportOptions } from "@/lib/excel-permissions"
import { ExcelExportType, ExcelExportScope, ExcelDateRange } from "@/types/excel"
import prisma from "@/lib/prisma"
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get("roomId")
  const type = searchParams.get("type") as ExcelExportType
  const scope = searchParams.get("scope") as ExcelExportScope
  const dateRange = searchParams.get("dateRange") as ExcelDateRange
  const startDateParam = searchParams.get("startDate")
  const endDateParam = searchParams.get("endDate")
  const userId = searchParams.get("userId")
  const preview = searchParams.get("preview") === "true"

  if (!roomId || !type || !scope || !dateRange) {
    return NextResponse.json({ 
      error: "Room ID, type, scope, and dateRange are required" 
    }, { status: 400 })
  }

  try {
    // Check if user is a member of the room
    const roomMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId,
        },
      },
      include: {
        room: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!roomMember) {
      return NextResponse.json({ error: "You are not a member of this room" }, { status: 403 })
    }

    // Get user permissions
    const permissions = getExcelPermissions(roomMember.role)

    // Validate export options
    const validation = validateExportOptions({ type, scope }, permissions)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 403 })
    }

    // Calculate date range
    let startDate: Date
    let endDate: Date

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
    } else {
      const now = new Date()
      switch (dateRange) {
        case "day":
          startDate = startOfDay(now)
          endDate = endOfDay(now)
          break
        case "week":
          startDate = startOfWeek(now, { weekStartsOn: 1 })
          endDate = endOfWeek(now, { weekStartsOn: 1 })
          break
        case "month":
          startDate = startOfMonth(now)
          endDate = endOfMonth(now)
          break
        default:
          startDate = startOfMonth(now)
          endDate = endOfMonth(now)
      }
    }

    // Handle different export types and scopes
    let result: any

    if (type === "all") {
      // Export all data types
      const [mealsResult, shoppingResult, paymentsResult] = await Promise.all([
        exportMealsToExcel(roomId, startDate, endDate, scope, userId || undefined),
        exportShoppingToExcel(roomId, startDate, endDate, scope, userId || undefined),
        exportPaymentsToExcel(roomId, startDate, endDate, scope, userId || undefined),
      ])

      // Generate meal preview table (calendar format) for better display
      const mealPreviewTable = await generateMealPreviewTable(roomId, startDate, endDate, scope, userId || undefined)
      const [header, ...rows] = mealPreviewTable
      const mealPreviewRows = rows.map(row => Object.fromEntries(header.map((key, i) => [key, row[i]])))

      // Fetch extra expenses
      const expenses = await prisma.extraExpense.findMany({
        where: {
          roomId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          user: { select: { name: true } },
        },
        orderBy: { date: "asc" },
      })
      const expenseRows = expenses.map(e => ({
        Date: e.date.toISOString().split("T")[0],
        Name: e.user?.name || "",
        Amount: e.amount,
        Description: e.description || "",
      }))

      // Generate balance and calculation previews
      const [balanceRows, calculationRows] = await Promise.all([
        generateBalancePreview(roomId, startDate, endDate, scope, userId || undefined),
        generateCalculationPreview(roomId, startDate, endDate, scope, userId || undefined),
      ])

      // Debug logging for empty results
      if (mealPreviewRows.length === 0) console.log("[Excel Export] No meals data found for filters", { roomId, startDate, endDate, scope, userId })
      if (shoppingResult.rows.length === 0) console.log("[Excel Export] No shopping data found for filters", { roomId, startDate, endDate, scope, userId })
      if (paymentsResult.rows.length === 0) console.log("[Excel Export] No payments data found for filters", { roomId, startDate, endDate, scope, userId })
      if (expenseRows.length === 0) console.log("[Excel Export] No expenses data found for filters", { roomId, startDate, endDate, scope, userId })
      if (balanceRows.length === 0) console.log("[Excel Export] No balance data found for filters", { roomId, startDate, endDate, scope, userId })
      if (calculationRows.length === 0) console.log("[Excel Export] No calculation data found for filters", { roomId, startDate, endDate, scope, userId })

      // Combine all data into one Excel file
      result = {
        buffer: mealsResult.buffer, // For now, just return meals as the main export
        filename: `${roomMember.room.name}_All_Data_${formatDateForFilename(startDate)}_to_${formatDateForFilename(endDate)}.xlsx`,
        preview: {
          meals: mealPreviewRows,
          shopping: shoppingResult.rows,
          payments: paymentsResult.rows,
          expenses: expenseRows,
          balances: balanceRows,
          calculations: calculationRows,
        },
      }
    } else {
      // Export specific type
      switch (type) {
        case "meals":
          result = await exportMealsToExcel(roomId, startDate, endDate, scope, userId || undefined)
          break
        case "shopping":
          result = await exportShoppingToExcel(roomId, startDate, endDate, scope, userId || undefined)
          break
        case "payments":
          result = await exportPaymentsToExcel(roomId, startDate, endDate, scope, userId || undefined)
          break
        case "expenses":
          result = await exportExpensesToExcel(roomId, startDate, endDate, scope, userId || undefined)
          break
        case "balances":
          result = await exportBalancesToExcel(roomId, startDate, endDate, scope, userId || undefined)
          break
        default:
          return NextResponse.json({ error: "Invalid export type" }, { status: 400 })
      }
    }

    if (preview) {
      // Return preview data only
      if (type === "all") {
        return NextResponse.json({
          success: true,
          preview: result.preview,
        })
      } else if (type === "meals") {
        const previewTable = await generateMealPreviewTable(roomId, startDate, endDate, scope, userId || undefined)
        // Convert 2D array to array of objects
        const [header, ...rows] = previewTable
        const previewRows = rows.map(row => Object.fromEntries(header.map((key, i) => [key, row[i]])))
        return NextResponse.json({
          success: true,
          preview: previewRows,
        })
      } else {
        return NextResponse.json({
          success: true,
          preview: result.rows,
        })
      }
    }

    // Convert buffer to base64
    const base64 = Buffer.from(result.buffer).toString("base64")

    return NextResponse.json({
      success: true,
      filename: result.filename,
      data: base64,
      exportedRows: result.exportedRows || 0,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    })
  } catch (error) {
    console.error("Error exporting data to Excel:", error)
    return NextResponse.json({ error: "Failed to export data to Excel" }, { status: 500 })
  }
}

// Helper function to format date for filename
function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0]
} 