import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { exportMealsToExcel, exportShoppingToExcel, exportPaymentsToExcel, generateMealPreviewTable, exportExpensesToExcel, exportBalancesToExcel, generateBalancePreview, generateCalculationPreview, exportDataToPDF, exportAllDataToExcel } from "@/lib/excel-utils"
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

    // Get requested format (excel or pdf)
    const format = searchParams.get("format") || "excel"

    // --- PREVIEW LOGIC: Always build preview data if preview=true ---
    if (preview) {
      // Build preview data for all types
      if (type === "all") {
        const [mealsResult, shoppingResult, paymentsResult] = await Promise.all([
          exportMealsToExcel(roomId, startDate, endDate, scope, userId || undefined),
          exportShoppingToExcel(roomId, startDate, endDate, scope, userId || undefined),
          exportPaymentsToExcel(roomId, startDate, endDate, scope, userId || undefined),
        ])
        const mealPreviewTable = await generateMealPreviewTable(roomId, startDate, endDate, scope, userId || undefined)
        const [header, ...rows] = mealPreviewTable
        const mealPreviewRows = rows.map(row => Object.fromEntries(header.map((key, i) => [key, row[i]])))
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
        const [balanceRows, calculationRows] = await Promise.all([
          generateBalancePreview(roomId, startDate, endDate, scope, userId || undefined),
          generateCalculationPreview(roomId, startDate, endDate, scope, userId || undefined),
        ])
        return NextResponse.json({
          success: true,
          preview: {
            meals: mealPreviewRows,
            shopping: shoppingResult.rows,
            payments: paymentsResult.rows,
            expenses: expenseRows,
            balances: balanceRows,
            calculations: calculationRows,
          },
        })
      } else if (type === "meals") {
        const previewTable = await generateMealPreviewTable(roomId, startDate, endDate, scope, userId || undefined)
        const [header, ...rows] = previewTable
        const previewRows = rows.map(row => Object.fromEntries(header.map((key, i) => [key, row[i]])))
        return NextResponse.json({
          success: true,
          preview: previewRows,
        })
      } else if (type === "shopping") {
        const shoppingResult = await exportShoppingToExcel(roomId, startDate, endDate, scope, userId || undefined)
        return NextResponse.json({
          success: true,
          preview: shoppingResult.rows,
        })
      } else if (type === "payments") {
        const paymentsResult = await exportPaymentsToExcel(roomId, startDate, endDate, scope, userId || undefined)
        return NextResponse.json({
          success: true,
          preview: paymentsResult.rows,
        })
      } else if (type === "expenses") {
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
        return NextResponse.json({
          success: true,
          preview: expenseRows,
        })
      } else if (type === "balances") {
        const balanceRows = await generateBalancePreview(roomId, startDate, endDate, scope, userId || undefined)
        return NextResponse.json({
          success: true,
          preview: balanceRows,
        })
      } else {
        return NextResponse.json({
          success: true,
          preview: [],
        })
      }
    }
    // --- END PREVIEW LOGIC ---

    // Handle different export types and scopes
    let result: any

    if (type === "all" && format === "excel") {
      // Use the correct function to export all data to Excel (multi-sheet)
      result = await exportAllDataToExcel(roomId, startDate, endDate, scope, userId || undefined);
    } else if (type === "all" && format === "pdf") {
      // Use the correct function to export all data to PDF
      result = await exportDataToPDF(roomId, startDate, endDate, scope, userId || undefined, type);
    } else if (type === "all") {
      // fallback for preview and other cases (keep existing logic)
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
      result = {
        buffer: mealsResult.buffer, // fallback for preview
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
      // If PDF, use exportDataToPDF
      if (format === 'pdf') {
        result = await exportDataToPDF(roomId, startDate, endDate, scope, userId || undefined, type)
      } else {
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
    }

    // --- FIX: Return binary file for download ---
    let buffer: Buffer;
    if (Buffer.isBuffer(result.buffer)) {
      buffer = result.buffer;
    } else if (result.buffer instanceof ArrayBuffer) {
      buffer = Buffer.from(new Uint8Array(result.buffer));
    } else if (Array.isArray(result.buffer)) {
      buffer = Buffer.from(result.buffer);
    } else if (result.buffer && result.buffer.buffer instanceof ArrayBuffer) {
      // Handle Uint8Array or similar
      buffer = Buffer.from(result.buffer);
    } else {
      throw new Error('Invalid buffer type returned from export function');
    }
    if (format === 'pdf') {
      // Debug: print first bytes of buffer
      console.log('PDF buffer preview:', buffer.slice(0, 32));
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
        },
      })
    } else {
      // Excel
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
        },
      })
    }
  } catch (error) {
    console.error("Error exporting data to Excel:", error)
    return NextResponse.json({ error: "Failed to export data to Excel" }, { status: 500 })
  }
}

// Helper function to format date for filename
function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0]
} 