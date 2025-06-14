import * as XLSX from "xlsx"
import prisma from "./prisma"

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

// Function to export meal data to Excel
export async function exportMealsToExcel(roomId: string, startDate: Date, endDate: Date) {
  try {
    // Get room details
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { name: true },
    })

    if (!room) {
      throw new Error("Room not found")
    }

    // Get all meals for the room in the date range
    const meals = await prisma.meal.findMany({
      where: {
        roomId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
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

    return {
      buffer: excelBuffer,
      filename: `${room.name}_Meals_${formatDateForFilename(startDate)}_to_${formatDateForFilename(endDate)}.xlsx`,
    }
  } catch (error) {
    console.error("Error exporting meals to Excel:", error)
    throw error
  }
}

// Function to export shopping data to Excel
export async function exportShoppingToExcel(roomId: string, startDate: Date, endDate: Date) {
  try {
    // Get room details
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { name: true },
    })

    if (!room) {
      throw new Error("Room not found")
    }

    // Get all shopping items for the room in the date range
    const shoppingItems = await prisma.shoppingItem.findMany({
      where: {
        roomId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
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
      Description: item.description,
      Amount: item.amount,
      AddedBy: item.user.name,
    }))

    // Add a total row
    const totalAmount = shoppingItems.reduce((sum, item) => sum + item.amount, 0)
    rows.push({
      Date: "",
      Description: "TOTAL",
      Amount: totalAmount,
      AddedBy: "",
    })

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

    return {
      buffer: excelBuffer,
      filename: `${room.name}_Shopping_${formatDateForFilename(startDate)}_to_${formatDateForFilename(endDate)}.xlsx`,
    }
  } catch (error) {
    console.error("Error exporting shopping to Excel:", error)
    throw error
  }
}

// Function to export payment data to Excel
export async function exportPaymentsToExcel(roomId: string, startDate: Date, endDate: Date) {
  try {
    // Get room details
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { name: true },
    })

    if (!room) {
      throw new Error("Room not found")
    }

    // Get all payments for the room in the date range
    const payments = await prisma.payment.findMany({
      where: {
        roomId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
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

    // Add a total row
    const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0)
    rows.push({
      Date: "",
      Name: "TOTAL",
      Amount: totalAmount,
      Method: "",
      Status: "",
    })

    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows)

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 20 }, // Name
      { wch: 12 }, // Amount
      { wch: 12 }, // Method
      { wch: 12 }, // Status
    ]
    worksheet["!cols"] = columnWidths

    // Create a workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payments")

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

    return {
      buffer: excelBuffer,
      filename: `${room.name}_Payments_${formatDateForFilename(startDate)}_to_${formatDateForFilename(endDate)}.xlsx`,
    }
  } catch (error) {
    console.error("Error exporting payments to Excel:", error)
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
              type: "BREAKFAST",
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          }

          if (row.Lunch && row.Lunch !== "0" && row.Lunch !== 0) {
            meals.push({
              userId,
              roomId,
              date,
              type: "LUNCH",
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          }

          if (row.Dinner && row.Dinner !== "0" && row.Dinner !== 0) {
            meals.push({
              userId,
              roomId,
              date,
              type: "DINNER",
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
