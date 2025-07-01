import * as XLSX from "xlsx"
import prisma from "@/lib/prisma"
import { MealType, ExtraExpense, Payment, ShoppingItem, Meal, RoomMember, User } from "@prisma/client"

// Types for Excel data
export type MealExcelRow = {
  Date: string
  Name: string
  Breakfast: string | number
  Lunch: string | number
  Dinner: string | number
  Total: string | number
}

export type ShoppingExcelRow = {
  Date: string
  Description: string
  Amount: string | number
  AddedBy: string
}

export type PaymentExcelRow = {
  Date: string
  Name: string
  Amount: string | number
  Method: string
  Status: string
}

// Type for Expense Excel Row
export type ExpenseExcelRow = {
  Date: string
  Name: string
  Amount: number
  Description: string
}

// Type for Balance Excel Row
export type BalanceExcelRow = {
  Name: string
  TotalMeals: number
  TotalShopping: number
  TotalPayments: number
  TotalExpenses: number
  Balance: number
}

// Function to export meal data to Excel
export async function exportMealsToExcel(
  roomId: string, 
  startDate: Date, 
  endDate: Date, 
  scope: 'all' | 'user' | 'individual' = 'all',
  userId?: string
): Promise<{ buffer: Buffer; filename: string; exportedRows: number; rows: MealExcelRow[] }> {
  try {
    // Get room details
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { name: true },
    })

    if (!room) {
      throw new Error("Room not found")
    }

    // Build meal query based on scope
    let mealQuery: any = {
      roomId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    }

    // Filter by user if scope is 'user' or 'individual'
    if (scope === 'user' && userId) {
      mealQuery.userId = userId
    } else if (scope === 'individual' && userId) {
      mealQuery.userId = userId
    }

    // Get meals based on scope
    const meals = await prisma.meal.findMany({
      where: mealQuery,
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    })

    // Get room members based on scope
    let roomMembers: any[] = []
    
    if (scope === 'all') {
      roomMembers = await prisma.roomMember.findMany({
        where: { roomId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    } else if (scope === 'user' && userId) {
      const member = await prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId,
            roomId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
      if (member) roomMembers = [member]
    } else if (scope === 'individual' && userId) {
      const member = await prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId,
            roomId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
      if (member) roomMembers = [member]
    }

    // Create a map of dates to track meals
    const mealsByDate = new Map<string, Map<string, { breakfast: boolean; lunch: boolean; dinner: boolean }>>()

    // Initialize the map with all dates and users
    const dateRange = getDateRange(startDate, endDate)
    dateRange.forEach((date) => {
      const dateStr = date.toISOString().split("T")[0]
      const userMap = new Map<string, { breakfast: boolean; lunch: boolean; dinner: boolean }>()

      roomMembers.forEach((member) => {
        userMap.set(member.user.id, { breakfast: false, lunch: false, dinner: false })
      })

      mealsByDate.set(dateStr, userMap)
    })

    // Fill in the meal data
    meals.forEach((meal) => {
      const dateStr = meal.date.toISOString().split("T")[0]
      const userMap = mealsByDate.get(dateStr)

      if (userMap) {
        const userData = userMap.get(meal.userId)
        if (userData) {
          if (meal.type === "BREAKFAST") userData.breakfast = true
          if (meal.type === "LUNCH") userData.lunch = true
          if (meal.type === "DINNER") userData.dinner = true
          userMap.set(meal.userId, userData)
        }
      }
    })

    // Convert to Excel rows
    const rows: MealExcelRow[] = []

    mealsByDate.forEach((userMap, dateStr) => {
      roomMembers.forEach((member) => {
        const userData = userMap.get(member.user.id)
        if (userData) {
          const breakfast = userData.breakfast ? 1 : 0
          const lunch = userData.lunch ? 1 : 0
          const dinner = userData.dinner ? 1 : 0
          const total = breakfast + lunch + dinner

          rows.push({
            Date: dateStr,
            Name: member.user.name,
            Breakfast: breakfast,
            Lunch: lunch,
            Dinner: dinner,
            Total: total,
          })
        }
      })
    })

    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows)

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 20 }, // Name
      { wch: 10 }, // Breakfast
      { wch: 10 }, // Lunch
      { wch: 10 }, // Dinner
      { wch: 10 }, // Total
    ]
    worksheet["!cols"] = columnWidths

    // Create a workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Meals")

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

    // Generate filename based on scope
    let filename = `${room.name}_Meals`
    if (scope === 'user') filename += '_My_Data'
    else if (scope === 'individual' && userId) {
      const user = roomMembers.find(m => m.user.id === userId)
      filename += `_${user?.user.name || 'User'}_Data`
    }
    filename += `_${formatDateForFilename(startDate)}_to_${formatDateForFilename(endDate)}.xlsx`

    return {
      buffer: excelBuffer,
      filename,
      exportedRows: rows.length,
      rows,
    }
  } catch (error) {
    console.error("Error exporting meals to Excel:", error)
    throw error
  }
}

// Function to export shopping data to Excel
export async function exportShoppingToExcel(
  roomId: string, 
  startDate: Date, 
  endDate: Date, 
  scope: 'all' | 'user' | 'individual' = 'all',
  userId?: string
): Promise<{ buffer: Buffer; filename: string; exportedRows: number; rows: ShoppingExcelRow[] }> {
  try {
    // Get room details
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { name: true },
    })

    if (!room) {
      throw new Error("Room not found")
    }

    // Build shopping query based on scope
    let shoppingQuery: any = {
      roomId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    }

    // Filter by user if scope is 'user' or 'individual'
    if (scope === 'user' && userId) {
      shoppingQuery.userId = userId
    } else if (scope === 'individual' && userId) {
      shoppingQuery.userId = userId
    }

    // Get all shopping items for the room in the date range
    const shoppingItems = await prisma.shoppingItem.findMany({
      where: shoppingQuery,
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    })

    // Convert to Excel rows
    const rows: ShoppingExcelRow[] = shoppingItems.map((item) => ({
      Date: item.date.toISOString().split("T")[0],
      Description: item.name,
      Amount: item.quantity,
      AddedBy: item.user.name,
    }))

    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows)

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 30 }, // Description
      { wch: 12 }, // Amount
      { wch: 20 }, // AddedBy
    ]
    worksheet["!cols"] = columnWidths

    // Create a workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shopping")

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

    // Generate filename based on scope
    let filename = `${room.name}_Shopping`
    if (scope === 'user') filename += '_My_Data'
    else if (scope === 'individual' && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      })
      filename += `_${user?.name || 'User'}_Data`
    }
    filename += `_${formatDateForFilename(startDate)}_to_${formatDateForFilename(endDate)}.xlsx`

    return {
      buffer: excelBuffer,
      filename,
      exportedRows: rows.length,
      rows,
    }
  } catch (error) {
    console.error("Error exporting shopping to Excel:", error)
    throw error
  }
}

// Function to export payment data to Excel
export async function exportPaymentsToExcel(
  roomId: string, 
  startDate: Date, 
  endDate: Date, 
  scope: 'all' | 'user' | 'individual' = 'all',
  userId?: string
): Promise<{ buffer: Buffer; filename: string; exportedRows: number; rows: PaymentExcelRow[] }> {
  try {
    // Get room details
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { name: true },
    })

    if (!room) {
      throw new Error("Room not found")
    }

    // Build payment query based on scope
    let paymentQuery: any = {
      roomId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    }

    // Filter by user if scope is 'user' or 'individual'
    if (scope === 'user' && userId) {
      paymentQuery.userId = userId
    } else if (scope === 'individual' && userId) {
      paymentQuery.userId = userId
    }

    // Get all payments for the room in the date range
    const payments = await prisma.payment.findMany({
      where: paymentQuery,
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    })

    // Convert to Excel rows
    const rows: PaymentExcelRow[] = payments.map((payment) => ({
      Date: payment.date.toISOString().split("T")[0],
      Name: payment.user.name,
      Amount: payment.amount,
      Method: payment.method,
      Status: payment.status,
    }))

    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows)

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 20 }, // Name
      { wch: 12 }, // Amount
      { wch: 15 }, // Method
      { wch: 12 }, // Status
    ]
    worksheet["!cols"] = columnWidths

    // Create a workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payments")

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

    // Generate filename based on scope
    let filename = `${room.name}_Payments`
    if (scope === 'user') filename += '_My_Data'
    else if (scope === 'individual' && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      })
      filename += `_${user?.name || 'User'}_Data`
    }
    filename += `_${formatDateForFilename(startDate)}_to_${formatDateForFilename(endDate)}.xlsx`

    return {
      buffer: excelBuffer,
      filename,
      exportedRows: rows.length,
      rows,
    }
  } catch (error) {
    console.error("Error exporting payments to Excel:", error)
    throw error
  }
}

// Function to export expense data to Excel
export async function exportExpensesToExcel(
  roomId: string,
  startDate: Date,
  endDate: Date,
  scope: 'all' | 'user' | 'individual' = 'all',
  userId?: string
): Promise<{ buffer: Buffer; filename: string; exportedRows: number; rows: ExpenseExcelRow[] }> {
  try {
    // Get room details
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { name: true },
    })
    if (!room) {
      throw new Error("Room not found")
    }
    // Build expense query based on scope
    let expenseQuery: any = {
      roomId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    }
    if ((scope === 'user' || scope === 'individual') && userId) {
      expenseQuery.userId = userId
    }
    // Get all extra expenses for the room in the date range
    const expenses = await prisma.extraExpense.findMany({
      where: expenseQuery,
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    })
    // Convert to Excel rows
    const rows: ExpenseExcelRow[] = expenses.map((e) => ({
      Date: e.date.toISOString().split("T")[0],
      Name: e.user?.name || "",
      Amount: e.amount,
      Description: e.description || "",
    }))
    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows)
    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 20 }, // Name
      { wch: 12 }, // Amount
      { wch: 30 }, // Description
    ]
    worksheet["!cols"] = columnWidths
    // Create a workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses")
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    // Generate filename based on scope
    let filename = `${room.name}_Expenses`
    if (scope === 'user') filename += '_My_Data'
    else if (scope === 'individual' && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      })
      filename += `_${user?.name || 'User'}_Data`
    }
    filename += `_${formatDateForFilename(startDate)}_to_${formatDateForFilename(endDate)}.xlsx`
    return {
      buffer: excelBuffer,
      filename,
      exportedRows: rows.length,
      rows,
    }
  } catch (error) {
    console.error("Error exporting expenses to Excel:", error)
    throw error
  }
}

// Function to import meal data from Excel
export async function importMealsFromExcel(roomId: string, buffer: ArrayBuffer) {
  try {
    // Read the Excel file
    const workbook = XLSX.read(buffer, { type: "array" })

    // Get the first worksheet
    const worksheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[worksheetName]

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json<MealExcelRow>(worksheet)

    // Get all users in the room
    const roomMembers = await prisma.roomMember.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Create a map of names to user IDs
    const userMap = new Map<string, string>()
    roomMembers.forEach((member) => {
      userMap.set(member.user.name.toLowerCase(), member.user.id)
    })

    // Process each row
    const results = await Promise.all(
      rows.map(async (row) => {
        try {
          // Skip rows without a date or name
          if (!row.Date || !row.Name) return null

          const date = new Date(row.Date)
          if (isNaN(date.getTime())) return null

          const userName = row.Name.toLowerCase()
          const userId = userMap.get(userName)
          if (!userId) return null

          // Process meals
          const meals = []

          if (row.Breakfast && row.Breakfast !== "0" && row.Breakfast !== 0) {
            meals.push({
              userId,
              roomId,
              date,
              type: "BREAKFAST" as MealType,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          }

          if (row.Lunch && row.Lunch !== "0" && row.Lunch !== 0) {
            meals.push({
              userId,
              roomId,
              date,
              type: "LUNCH" as MealType,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          }

          if (row.Dinner && row.Dinner !== "0" && row.Dinner !== 0) {
            meals.push({
              userId,
              roomId,
              date,
              type: "DINNER" as MealType,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          }

          // Delete existing meals for this user on this date
          await prisma.meal.deleteMany({
            where: {
              userId,
              roomId,
              date: {
                gte: new Date(date.setHours(0, 0, 0, 0)),
                lt: new Date(date.setHours(23, 59, 59, 999)),
              },
            },
          })

          // Create new meals
          if (meals.length > 0) {
            await prisma.meal.createMany({
              data: meals,
            })
          }

          return meals.length
        } catch (error) {
          console.error("Error processing row:", row, error)
          return null
        }
      }),
    )

    // Count successful imports
    const successCount = results.filter((r) => r !== null).reduce((sum, count) => sum + (count || 0), 0)

    return {
      success: true,
      importedMeals: successCount,
      totalRows: rows.length,
    }
  } catch (error) {
    console.error("Error importing meals from Excel:", error)
    throw error
  }
}

// Function to import shopping data from Excel
export async function importShoppingFromExcel(roomId: string, buffer: ArrayBuffer) {
  try {
    // Read the Excel file
    const workbook = XLSX.read(buffer, { type: "array" })

    // Get the first worksheet
    const worksheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[worksheetName]

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json<ShoppingExcelRow>(worksheet)

    // Get all users in the room
    const roomMembers = await prisma.roomMember.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Create a map of names to user IDs
    const userMap = new Map<string, string>()
    roomMembers.forEach((member) => {
      userMap.set(member.user.name.toLowerCase(), member.user.id)
    })

    // Process each row
    const results = await Promise.all(
      rows.map(async (row) => {
        try {
          // Skip rows without required fields
          if (!row.Date || !row.Description || !row.Amount) return null

          const date = new Date(row.Date)
          if (isNaN(date.getTime())) return null

          const addedByName = row.AddedBy?.toLowerCase() || ''
          const userId = userMap.get(addedByName) || roomMembers[0]?.user.id
          if (!userId) return null

          // Create shopping item
          await prisma.shoppingItem.create({
            data: {
              name: row.Description,
              description: row.Description,
              quantity: Number(row.Amount) || 1,
              date,
              userId,
              roomId,
            },
          })

          return 1
        } catch (error) {
          console.error("Error processing shopping row:", row, error)
          return null
        }
      }),
    )

    // Count successful imports
    const successCount = results.filter((r) => r !== null).reduce((sum, count) => sum + (count || 0), 0)

    return {
      success: true,
      importedRows: successCount,
      totalRows: rows.length,
    }
  } catch (error) {
    console.error("Error importing shopping from Excel:", error)
    throw error
  }
}

// Function to import payment data from Excel
export async function importPaymentsFromExcel(roomId: string, buffer: ArrayBuffer) {
  try {
    // Read the Excel file
    const workbook = XLSX.read(buffer, { type: "array" })

    // Get the first worksheet
    const worksheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[worksheetName]

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json<PaymentExcelRow>(worksheet)

    // Get all users in the room
    const roomMembers = await prisma.roomMember.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Create a map of names to user IDs
    const userMap = new Map<string, string>()
    roomMembers.forEach((member) => {
      userMap.set(member.user.name.toLowerCase(), member.user.id)
    })

    // Process each row
    const results = await Promise.all(
      rows.map(async (row) => {
        try {
          // Skip rows without required fields
          if (!row.Date || !row.Name || !row.Amount) return null

          const date = new Date(row.Date)
          if (isNaN(date.getTime())) return null

          const userName = row.Name.toLowerCase()
          const userId = userMap.get(userName)
          if (!userId) return null

          // Create payment
          await prisma.payment.create({
            data: {
              amount: Number(row.Amount) || 0,
              date,
              method: (row.Method as any) || 'CASH',
              status: (row.Status as any) || 'PENDING',
              description: `Imported from Excel - ${row.Name}`,
              userId,
              roomId,
            },
          })

          return 1
        } catch (error) {
          console.error("Error processing payment row:", row, error)
          return null
        }
      }),
    )

    // Count successful imports
    const successCount = results.filter((r) => r !== null).reduce((sum, count) => sum + (count || 0), 0)

    return {
      success: true,
      importedRows: successCount,
      totalRows: rows.length,
    }
  } catch (error) {
    console.error("Error importing payments from Excel:", error)
    throw error
  }
}

// Helper function to get a range of dates
function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dates
}

// Helper function to format date for filenames
function formatDateForFilename(date: Date): string {
  return date.toISOString().split("T")[0]
}

// Function to process meal data
async function processMealData(rows: any[], userId: string, roomId: string) {
  const meals = rows.map((row) => ({
    userId,
    roomId,
    date: new Date(row.date),
    type: row.type.toUpperCase() as MealType,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  if (meals.length > 0) {
    await prisma.meal.createMany({
      data: meals,
    })
  }
}

export async function exportGroupCalendarToExcel(roomId: string, year: number, month: number) {
  // Get all members
  const members: (RoomMember & { user: User })[] = await prisma.roomMember.findMany({
    where: { roomId },
    include: { user: true },
  })

  // Get all meals for the month
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  const meals: Meal[] = await prisma.meal.findMany({
    where: { roomId, date: { gte: start, lte: end } },
  })

  // Get all shopping for the month
  const shopping: ShoppingItem[] = await prisma.shoppingItem.findMany({
    where: { roomId, date: { gte: start, lte: end } },
  })

  // Get all payments for the month
  const payments: Payment[] = await prisma.payment.findMany({
    where: { roomId, date: { gte: start, lte: end } },
  })

  // Get all expenses for the month
  const expenses: ExtraExpense[] = await prisma.extraExpense.findMany({
    where: { roomId, date: { gte: start, lte: end } },
  })

  const daysInMonth = end.getDate()
  const header = ["MEMBERS NAME", ...Array.from({ length: daysInMonth }, (_, i) => i + 1), "Total Meals", "Total Shopping", "Total Payments", "Total Expenses", "Balance"]
  const data = [header]

  // Helper: sum for a user by day
  function countMeals(userId: string, day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return meals.filter(m => m.userId === userId && m.date.toISOString().startsWith(dateStr)).length
  }
  function sumShopping(userId: string) {
    return shopping.filter(s => s.userId === userId).reduce((sum, s) => sum + (s.quantity || 0), 0)
  }
  function sumPayments(userId: string) {
    return payments.filter(p => p.userId === userId).reduce((sum, p) => sum + (p.amount || 0), 0)
  }
  function sumExpenses(userId: string) {
    return expenses.filter(e => e.userId === userId).reduce((sum, e) => sum + (e.amount || 0), 0)
  }
  function calcBalance(userId: string) {
    // Example: payments - (shopping + expenses)
    return sumPayments(userId) - (sumShopping(userId) + sumExpenses(userId))
  }

  // Fill member rows
  members.forEach(member => {
    const row = [member.user.name]
    let totalMeals = 0
    for (let day = 1; day <= daysInMonth; day++) {
      const mealCount = countMeals(member.userId, day)
      row.push(mealCount.toString())
      totalMeals += mealCount
    }
    row.push(totalMeals.toString())
    row.push(sumShopping(member.userId).toString())
    row.push(sumPayments(member.userId).toString())
    row.push(sumExpenses(member.userId).toString())
    row.push(calcBalance(member.userId).toString())
    data.push(row)
  })

  // Add summary row
  const counterRow = ["TOTAL"]
  for (let day = 1; day <= daysInMonth; day++) {
    const count = members.reduce((sum, member) => sum + countMeals(member.userId, day), 0)
    counterRow.push(count.toString())
  }
  counterRow.push("") // For Total Meals
  counterRow.push(shopping.reduce((sum, s) => sum + (s.quantity || 0), 0).toString())
  counterRow.push(payments.reduce((sum, p) => sum + (p.amount || 0), 0).toString())
  counterRow.push(expenses.reduce((sum, e) => sum + (e.amount || 0), 0).toString())
  counterRow.push("") // For Balance
  data.push(counterRow)

  // Export to Excel
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Group Calendar")
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })

  return {
    buffer,
    filename: `Group_Calendar_${year}_${String(month + 1).padStart(2, '0')}.xlsx`,
  }
}

export async function generateMealPreviewTable(
  roomId: string,
  startDate: Date,
  endDate: Date,
  scope: 'all' | 'user' | 'individual' = 'all',
  userId?: string
): Promise<any[][]> {
  // Get all members
  const members: (RoomMember & { user: User })[] = await prisma.roomMember.findMany({
    where: { roomId },
    include: { user: true },
  })

  // Get all meals for the range
  const meals: Meal[] = await prisma.meal.findMany({
    where: { roomId, date: { gte: startDate, lte: endDate } },
  })

  // Filter members by scope
  let filteredMembers = members
  if ((scope === 'user' || scope === 'individual') && userId) {
    filteredMembers = members.filter(m => m.userId === userId)
  }

  // Build header with day number and day name
  const daysInMonth = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dayNum = date.getDate()
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    return `${dayNum} (${dayName})`
  })
  const header = ["Members", ...dayHeaders, "Total"]
  const data = [header]

  // Helper: count meals for a user on a day
  function countMeals(userId: string, day: number) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + day - 1)
    const dateStr = date.toISOString().split('T')[0]
    return meals.filter(m => m.userId === userId && m.date.toISOString().startsWith(dateStr)).length
  }

  // Fill member rows
  filteredMembers.forEach(member => {
    const row = [member.user.name]
    let totalMeals = 0
    for (let day = 1; day <= daysInMonth; day++) {
      const mealCount = countMeals(member.userId, day)
      row.push(mealCount.toString())
      totalMeals += mealCount
    }
    row.push(totalMeals.toString())
    data.push(row)
  })

  // Add Totals row
  const totalsRow = ["Totals"]
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + day - 1)
    const dateStr = date.toISOString().split('T')[0]
    const count = filteredMembers.reduce((sum, member) => sum + meals.filter(m => m.userId === member.userId && m.date.toISOString().startsWith(dateStr)).length, 0)
    totalsRow.push(count.toString())
  }
  const grandTotal = totalsRow.slice(1).reduce((sum, n) => sum + (parseInt(n) || 0), 0)
  totalsRow.push(grandTotal.toString())
  data.push(totalsRow)

  return data
}

// Function to export balances to Excel
export async function exportBalancesToExcel(
  roomId: string,
  startDate: Date,
  endDate: Date,
  scope: 'all' | 'user' | 'individual' = 'all',
  userId?: string
): Promise<{ buffer: Buffer; filename: string; exportedRows: number; rows: BalanceExcelRow[] }> {
  // Get all members
  const members: (RoomMember & { user: User })[] = await prisma.roomMember.findMany({
    where: { roomId },
    include: { user: true },
  })
  // Filter members by scope
  let filteredMembers = members
  if ((scope === 'user' || scope === 'individual') && userId) {
    filteredMembers = members.filter(m => m.userId === userId)
  }
  // Get all meals, shopping, payments, expenses for the range
  const [meals, shopping, payments, expenses] = await Promise.all([
    prisma.meal.findMany({ where: { roomId, date: { gte: startDate, lte: endDate } } }),
    prisma.shoppingItem.findMany({ where: { roomId, date: { gte: startDate, lte: endDate } } }),
    prisma.payment.findMany({ where: { roomId, date: { gte: startDate, lte: endDate } } }),
    prisma.extraExpense.findMany({ where: { roomId, date: { gte: startDate, lte: endDate } } }),
  ])
  // Helper functions
  function countMeals(userId: string) {
    return meals.filter(m => m.userId === userId).length
  }
  function sumShopping(userId: string) {
    return shopping.filter(s => s.userId === userId).reduce((sum, s) => sum + (s.quantity || 0), 0)
  }
  function sumPayments(userId: string) {
    return payments.filter(p => p.userId === userId).reduce((sum, p) => sum + (p.amount || 0), 0)
  }
  function sumExpenses(userId: string) {
    return expenses.filter(e => e.userId === userId).reduce((sum, e) => sum + (e.amount || 0), 0)
  }
  function calcBalance(userId: string) {
    return sumPayments(userId) - (sumShopping(userId) + sumExpenses(userId))
  }
  // Build rows
  const rows: BalanceExcelRow[] = filteredMembers.map(member => ({
    Name: member.user.name,
    TotalMeals: countMeals(member.userId),
    TotalShopping: sumShopping(member.userId),
    TotalPayments: sumPayments(member.userId),
    TotalExpenses: sumExpenses(member.userId),
    Balance: calcBalance(member.userId),
  }))
  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet["!cols"] = [
    { wch: 20 }, // Name
    { wch: 12 }, // TotalMeals
    { wch: 15 }, // TotalShopping
    { wch: 15 }, // TotalPayments
    { wch: 15 }, // TotalExpenses
    { wch: 12 }, // Balance
  ]
  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Balances")
  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  // Get room name
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { name: true } })
  let filename = `${room?.name || 'Room'}_Balances`
  if (scope === 'user') filename += '_My_Data'
  else if (scope === 'individual' && userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    filename += `_${user?.name || 'User'}_Data`
  }
  filename += `_${formatDateForFilename(startDate)}_to_${formatDateForFilename(endDate)}.xlsx`
  return {
    buffer: excelBuffer,
    filename,
    exportedRows: rows.length,
    rows,
  }
}

// Function to generate balance preview data (without Excel export)
export async function generateBalancePreview(
  roomId: string,
  startDate: Date,
  endDate: Date,
  scope: 'all' | 'user' | 'individual' = 'all',
  userId?: string
): Promise<BalanceExcelRow[]> {
  // Get all members
  const members: (RoomMember & { user: User })[] = await prisma.roomMember.findMany({
    where: { roomId },
    include: { user: true },
  })
  
  // Filter members by scope
  let filteredMembers = members
  if ((scope === 'user' || scope === 'individual') && userId) {
    filteredMembers = members.filter(m => m.userId === userId)
  }
  
  // Get all meals, shopping, payments, expenses for the range
  const [meals, shopping, payments, expenses] = await Promise.all([
    prisma.meal.findMany({ where: { roomId, date: { gte: startDate, lte: endDate } } }),
    prisma.shoppingItem.findMany({ where: { roomId, date: { gte: startDate, lte: endDate } } }),
    prisma.payment.findMany({ where: { roomId, date: { gte: startDate, lte: endDate } } }),
    prisma.extraExpense.findMany({ where: { roomId, date: { gte: startDate, lte: endDate } } }),
  ])
  
  // Helper functions
  function countMeals(userId: string) {
    return meals.filter(m => m.userId === userId).length
  }
  function sumShopping(userId: string) {
    return shopping.filter(s => s.userId === userId).reduce((sum, s) => sum + (s.quantity || 0), 0)
  }
  function sumPayments(userId: string) {
    return payments.filter(p => p.userId === userId).reduce((sum, p) => sum + (p.amount || 0), 0)
  }
  function sumExpenses(userId: string) {
    return expenses.filter(e => e.userId === userId).reduce((sum, e) => sum + (e.amount || 0), 0)
  }
  function calcBalance(userId: string) {
    return sumPayments(userId) - (sumShopping(userId) + sumExpenses(userId))
  }
  
  // Build rows
  const rows: BalanceExcelRow[] = filteredMembers.map(member => ({
    Name: member.user.name,
    TotalMeals: countMeals(member.userId),
    TotalShopping: sumShopping(member.userId),
    TotalPayments: sumPayments(member.userId),
    TotalExpenses: sumExpenses(member.userId),
    Balance: calcBalance(member.userId),
  }))
  
  return rows
}

// Function to generate calculation preview data
export async function generateCalculationPreview(
  roomId: string,
  startDate: Date,
  endDate: Date,
  scope: 'all' | 'user' | 'individual' = 'all',
  userId?: string
): Promise<any[]> {
  // Get all members
  const members: (RoomMember & { user: User })[] = await prisma.roomMember.findMany({
    where: { roomId },
    include: { user: true },
  })
  
  // Filter members by scope
  let filteredMembers = members
  if ((scope === 'user' || scope === 'individual') && userId) {
    filteredMembers = members.filter(m => m.userId === userId)
  }
  
  // Get all meals, shopping, payments, expenses for the range
  const [meals, shopping, payments, expenses] = await Promise.all([
    prisma.meal.findMany({ where: { roomId, date: { gte: startDate, lte: endDate } } }),
    prisma.shoppingItem.findMany({ where: { roomId, date: { gte: startDate, lte: endDate } } }),
    prisma.payment.findMany({ where: { roomId, date: { gte: startDate, lte: endDate } } }),
    prisma.extraExpense.findMany({ where: { roomId, date: { gte: startDate, lte: endDate } } }),
  ])
  
  // Calculate totals
  const totalMeals = meals.length
  const totalShopping = shopping.reduce((sum, s) => sum + (s.quantity || 0), 0)
  const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const totalBalance = totalPayments - (totalShopping + totalExpenses)
  
  // Calculate per meal cost
  const perMealCost = totalMeals > 0 ? (totalShopping + totalExpenses) / totalMeals : 0
  
  // Build calculation rows
  const rows = [
    {
      Category: "Total Meals",
      Value: totalMeals,
      Description: "Total number of meals consumed"
    },
    {
      Category: "Total Shopping",
      Value: totalShopping,
      Description: "Total shopping expenses"
    },
    {
      Category: "Total Payments",
      Value: totalPayments,
      Description: "Total payments made"
    },
    {
      Category: "Total Expenses",
      Value: totalExpenses,
      Description: "Total extra expenses"
    },
    {
      Category: "Net Balance",
      Value: totalBalance,
      Description: "Total payments minus total expenses"
    },
    {
      Category: "Per Meal Cost",
      Value: perMealCost.toFixed(2),
      Description: "Average cost per meal"
    }
  ]
  
  return rows
}

// Function to export all data types to a single Excel file with multiple sheets
export async function exportAllDataToExcel(
  roomId: string,
  startDate: Date,
  endDate: Date,
  scope: 'all' | 'user' | 'individual' = 'all',
  userId?: string
): Promise<{ buffer: Buffer; filename: string; exportedRows: number }> {
  try {
    // Get room details
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { name: true },
    })

    if (!room) {
      throw new Error("Room not found")
    }

    // Create a new workbook
    const workbook = XLSX.utils.book_new()

    // Get all data
    const [mealsResult, shoppingResult, paymentsResult, balanceRows, calculationRows] = await Promise.all([
      exportMealsToExcel(roomId, startDate, endDate, scope, userId),
      exportShoppingToExcel(roomId, startDate, endDate, scope, userId),
      exportPaymentsToExcel(roomId, startDate, endDate, scope, userId),
      generateBalancePreview(roomId, startDate, endDate, scope, userId),
      generateCalculationPreview(roomId, startDate, endDate, scope, userId),
    ])

    // Get expenses data
    const expenses = await prisma.extraExpense.findMany({
      where: {
        roomId,
        date: { gte: startDate, lte: endDate },
      },
      include: { user: { select: { name: true } } },
      orderBy: { date: "asc" },
    })

    const expenseRows = expenses.map(e => ({
      Date: e.date.toISOString().split("T")[0],
      Name: e.user?.name || "",
      Amount: e.amount,
      Description: e.description || "",
    }))

    // Generate meal calendar format
    const mealPreviewTable = await generateMealPreviewTable(roomId, startDate, endDate, scope, userId)
    const mealCalendarSheet = XLSX.utils.aoa_to_sheet(mealPreviewTable)

    // Create worksheets for each data type
    const mealsSheet = XLSX.utils.json_to_sheet(mealsResult.rows)
    const shoppingSheet = XLSX.utils.json_to_sheet(shoppingResult.rows)
    const paymentsSheet = XLSX.utils.json_to_sheet(paymentsResult.rows)
    const expensesSheet = XLSX.utils.json_to_sheet(expenseRows)
    const balancesSheet = XLSX.utils.json_to_sheet(balanceRows)
    const calculationsSheet = XLSX.utils.json_to_sheet(calculationRows)

    // Set column widths for better formatting
    const setColumnWidths = (sheet: XLSX.WorkSheet, widths: number[]) => {
      sheet["!cols"] = widths.map(w => ({ wch: w }))
    }

    setColumnWidths(mealsSheet, [12, 20, 10, 10, 10, 10]) // Date, Name, Breakfast, Lunch, Dinner, Total
    setColumnWidths(shoppingSheet, [12, 30, 12, 20]) // Date, Description, Amount, AddedBy
    setColumnWidths(paymentsSheet, [12, 20, 12, 15, 12]) // Date, Name, Amount, Method, Status
    setColumnWidths(expensesSheet, [12, 20, 12, 30]) // Date, Name, Amount, Description
    setColumnWidths(balancesSheet, [20, 12, 15, 15, 15, 12]) // Name, TotalMeals, TotalShopping, TotalPayments, TotalExpenses, Balance
    setColumnWidths(calculationsSheet, [20, 15, 40]) // Category, Value, Description

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(workbook, mealCalendarSheet, "Meals Calendar")
    XLSX.utils.book_append_sheet(workbook, mealsSheet, "Meals Detail")
    XLSX.utils.book_append_sheet(workbook, shoppingSheet, "Shopping")
    XLSX.utils.book_append_sheet(workbook, paymentsSheet, "Payments")
    XLSX.utils.book_append_sheet(workbook, expensesSheet, "Expenses")
    XLSX.utils.book_append_sheet(workbook, balancesSheet, "Balances")
    XLSX.utils.book_append_sheet(workbook, calculationsSheet, "Calculations")

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

    // Generate filename
    let filename = `${room.name}_Complete_Report`
    if (scope === 'user') filename += '_My_Data'
    else if (scope === 'individual' && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      })
      filename += `_${user?.name || 'User'}_Data`
    }
    filename += `_${formatDateForFilename(startDate)}_to_${formatDateForFilename(endDate)}.xlsx`

    const totalRows = mealsResult.rows.length + shoppingResult.rows.length + 
                     paymentsResult.rows.length + expenseRows.length + 
                     balanceRows.length + calculationRows.length

    return {
      buffer: excelBuffer,
      filename,
      exportedRows: totalRows,
    }
  } catch (error) {
    console.error("Error exporting all data to Excel:", error)
    throw error
  }
}

// Function to export data to PDF
export async function exportDataToPDF(
  roomId: string,
  startDate: Date,
  endDate: Date,
  scope: 'all' | 'user' | 'individual' = 'all',
  userId?: string
): Promise<{ buffer: Buffer; filename: string }> {
  try {
    // Dynamic import for jsPDF to avoid SSR issues
    const { default: jsPDF } = await import('jspdf')
    await import('jspdf-autotable')

    // Get room details
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { name: true },
    })

    if (!room) {
      throw new Error("Room not found")
    }

    // Create PDF document
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - (2 * margin)

    let yPosition = margin

    // Add title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(`${room.name} - Data Report`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition = yPosition + 15

    // Add date range
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    const dateRangeText = `${formatDateForFilename(startDate)} to ${formatDateForFilename(endDate)}`
    doc.text(dateRangeText, pageWidth / 2, yPosition, { align: 'center' })
    yPosition = yPosition + 20

    // Get all data
    const [mealsResult, shoppingResult, paymentsResult, balanceRows, calculationRows] = await Promise.all([
      exportMealsToExcel(roomId, startDate, endDate, scope, userId),
      exportShoppingToExcel(roomId, startDate, endDate, scope, userId),
      exportPaymentsToExcel(roomId, startDate, endDate, scope, userId),
      generateBalancePreview(roomId, startDate, endDate, scope, userId),
      generateCalculationPreview(roomId, startDate, endDate, scope, userId),
    ])

    // Get expenses data
    const expenses = await prisma.extraExpense.findMany({
      where: {
        roomId,
        date: { gte: startDate, lte: endDate },
      },
      include: { user: { select: { name: true } } },
      orderBy: { date: "asc" },
    })

    const expenseRows = expenses.map(e => [
      e.date.toISOString().split("T")[0],
      e.user?.name || "",
      e.amount.toString(),
      e.description || ""
    ])

    // Helper function to add table with title
    const addTable = (title: string, headers: string[], data: any[][]) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        doc.addPage()
        yPosition = margin
      }

      // Add section title
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(title, margin, yPosition)
      yPosition = yPosition + 8

      // Add table
      const lastAutoTable = (doc as any).lastAutoTable
      if (lastAutoTable && typeof lastAutoTable.finalY === 'number') {
        yPosition = lastAutoTable.finalY + 10
      } else {
        yPosition = yPosition + 10
      }
      (doc as any).autoTable({
        startY: yPosition,
        head: [headers],
        body: data,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      })
      return;
    }

    // Add summary calculations
    if (calculationRows.length > 0) {
      const calcHeaders = ['Category', 'Value', 'Description']
      const calcData = calculationRows.map(row => [
        row.Category,
        row.Value.toString(),
        row.Description
      ])
      addTable('Summary Calculations', calcHeaders, calcData)
    }

    // Add balances
    if (balanceRows.length > 0) {
      const balanceHeaders = ['Name', 'Total Meals', 'Total Shopping', 'Total Payments', 'Total Expenses', 'Balance']
      const balanceData = balanceRows.map(row => [
        row.Name,
        row.TotalMeals.toString(),
        row.TotalShopping.toString(),
        row.TotalPayments.toString(),
        row.TotalExpenses.toString(),
        row.Balance.toString()
      ])
      addTable('Member Balances', balanceHeaders, balanceData)
    }

    // Add meals data
    if (mealsResult.rows.length > 0) {
      const mealHeaders = ['Date', 'Name', 'Breakfast', 'Lunch', 'Dinner', 'Total']
      const mealData = mealsResult.rows.map(row => [
        row.Date,
        row.Name,
        row.Breakfast.toString(),
        row.Lunch.toString(),
        row.Dinner.toString(),
        row.Total.toString()
      ])
      addTable('Meals Detail', mealHeaders, mealData)
    }

    // Add shopping data
    if (shoppingResult.rows.length > 0) {
      const shoppingHeaders = ['Date', 'Description', 'Amount', 'Added By']
      const shoppingData = shoppingResult.rows.map(row => [
        row.Date,
        row.Description,
        row.Amount.toString(),
        row.AddedBy
      ])
      addTable('Shopping Items', shoppingHeaders, shoppingData)
    }

    // Add payments data
    if (paymentsResult.rows.length > 0) {
      const paymentHeaders = ['Date', 'Name', 'Amount', 'Method', 'Status']
      const paymentData = paymentsResult.rows.map(row => [
        row.Date,
        row.Name,
        row.Amount.toString(),
        row.Method,
        row.Status
      ])
      addTable('Payments', paymentHeaders, paymentData)
    }

    // Add expenses data
    if (expenseRows.length > 0) {
      const expenseHeaders = ['Date', 'Name', 'Amount', 'Description']
      addTable('Extra Expenses', expenseHeaders, expenseRows)
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // Generate filename
    let filename = `${room.name}_Complete_Report`
    if (scope === 'user') filename += '_My_Data'
    else if (scope === 'individual' && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      })
      filename += `_${user?.name || 'User'}_Data`
    }
    filename += `_${formatDateForFilename(startDate)}_to_${formatDateForFilename(endDate)}.pdf`

    return {
      buffer: pdfBuffer,
      filename,
    }
  } catch (error) {
    console.error("Error exporting data to PDF:", error)
    throw error
  }
}
