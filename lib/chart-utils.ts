import type { MealType } from "@prisma/client"

// Function to generate meal count data for charts
export function generateMealCountData(meals: any[]) {
  const mealTypes = {
    BREAKFAST: "Breakfast",
    LUNCH: "Lunch",
    DINNER: "Dinner",
    CUSTOM: "Custom",
  }

  const mealCounts = Object.keys(mealTypes).map((type) => {
    return {
      name: mealTypes[type as MealType],
      value: meals.filter((meal) => meal.type === type).length,
    }
  })

  return mealCounts.filter((item) => item.value > 0)
}

// Function to generate expense data for charts
export function generateExpenseData(expenses: any[], shoppingItems: any[]) {
  // Combine all expenses
  const allExpenses = [
    ...expenses.map((expense) => ({
      name: expense.type,
      value: expense.amount,
      date: new Date(expense.date),
    })),
    ...shoppingItems.map((item) => ({
      name: "SHOPPING",
      value: item.amount,
      date: new Date(item.date),
    })),
  ]

  // Sort by date
  allExpenses.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Group by type
  const expensesByType: Record<string, number> = {}
  allExpenses.forEach((expense) => {
    if (!expensesByType[expense.name]) {
      expensesByType[expense.name] = 0
    }
    expensesByType[expense.name] += expense.amount
  })

  // Convert to array format for charts
  return Object.entries(expensesByType).map(([name, value]) => ({
    name: formatExpenseType(name),
    value: Number(value.toFixed(2)),
  }))
}

// Function to generate meal rate trend data
export function generateMealRateTrendData(calculations: any[]) {
  return calculations
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .map((calc) => ({
      name: formatDate(calc.startDate),
      value: Number(calc.mealRate.toFixed(2)),
    }))
}

// Helper function to format expense type
function formatExpenseType(type: string) {
  const typeMap: Record<string, string> = {
    UTILITY: "Utility",
    RENT: "Rent",
    INTERNET: "Internet",
    CLEANING: "Cleaning",
    MAINTENANCE: "Maintenance",
    OTHER: "Other",
    SHOPPING: "Shopping",
  }

  return typeMap[type] || type
}

// Helper function to format date
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return `${date.getDate()}/${date.getMonth() + 1}`
}

// Function to generate monthly expense data
export function generateMonthlyExpenseData(expenses: any[], shoppingItems: any[]) {
  // Combine all expenses
  const allExpenses = [
    ...expenses.map((expense) => ({
      amount: expense.amount,
      date: new Date(expense.date),
    })),
    ...shoppingItems.map((item) => ({
      amount: item.amount,
      date: new Date(item.date),
    })),
  ]

  // Group by month
  const expensesByMonth: Record<string, number> = {}
  allExpenses.forEach((expense) => {
    const monthYear = `${expense.date.getMonth() + 1}/${expense.date.getFullYear()}`
    if (!expensesByMonth[monthYear]) {
      expensesByMonth[monthYear] = 0
    }
    expensesByMonth[monthYear] += expense.amount
  })

  // Convert to array format for charts
  return Object.entries(expensesByMonth)
    .map(([monthYear, amount]) => ({
      name: monthYear,
      value: Number(amount.toFixed(2)),
    }))
    .sort((a, b) => {
      const [aMonth, aYear] = a.name.split("/").map(Number)
      const [bMonth, bYear] = b.name.split("/").map(Number)
      if (aYear !== bYear) return aYear - bYear
      return aMonth - bMonth
    })
}
