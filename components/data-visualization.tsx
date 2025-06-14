"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  generateMealCountData,
  generateExpenseData,
  generateMealRateTrendData,
  generateMonthlyExpenseData,
} from "@/lib/chart-utils"
import { useLanguage } from "@/contexts/language-context"
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#8DD1E1"]

interface DataVisualizationProps {
  meals: any[]
  expenses: any[]
  shoppingItems: any[]
  calculations: any[]
}

export function DataVisualization({ meals, expenses, shoppingItems, calculations }: DataVisualizationProps) {
  const [roomFilter, setRoomFilter] = useState<string>("all")
  const { t } = useLanguage()

  // Get unique rooms from meals
  const rooms = Array.from(new Set(meals.map((meal) => meal.roomId))).map((roomId) => {
    const meal = meals.find((m) => m.roomId === roomId)
    return {
      id: roomId,
      name: meal?.room?.name || "Unknown Room",
    }
  })

  // Filter data based on selected room
  const filteredMeals = roomFilter === "all" ? meals : meals.filter((meal) => meal.roomId === roomFilter)
  const filteredExpenses = roomFilter === "all" ? expenses : expenses.filter((expense) => expense.roomId === roomFilter)
  const filteredShoppingItems =
    roomFilter === "all" ? shoppingItems : shoppingItems.filter((item) => item.roomId === roomFilter)
  const filteredCalculations =
    roomFilter === "all" ? calculations : calculations.filter((calc) => calc.roomId === roomFilter)

  // Generate chart data
  const mealCountData = generateMealCountData(filteredMeals)
  const expenseData = generateExpenseData(filteredExpenses, filteredShoppingItems)
  const mealRateTrendData = generateMealRateTrendData(filteredCalculations)
  const monthlyExpenseData = generateMonthlyExpenseData(filteredExpenses, filteredShoppingItems)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Data Visualization</h2>
        <Select value={roomFilter} onValueChange={setRoomFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by room" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rooms</SelectItem>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="meals" className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="meals">Meal Distribution</TabsTrigger>
          <TabsTrigger value="expenses">Expense Distribution</TabsTrigger>
          <TabsTrigger value="mealRate">Meal Rate Trend</TabsTrigger>
          <TabsTrigger value="monthlyExpense">Monthly Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="meals">
          <Card>
            <CardHeader>
              <CardTitle>Meal Distribution</CardTitle>
              <CardDescription>Distribution of meals by type</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mealCountData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {mealCountData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} meals`, "Count"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Expense Distribution</CardTitle>
              <CardDescription>Distribution of expenses by category</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}`, "Amount"]} />
                  <Legend />
                  <Bar dataKey="value" name="Amount" fill="#8884d8">
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mealRate">
          <Card>
            <CardHeader>
              <CardTitle>Meal Rate Trend</CardTitle>
              <CardDescription>Trend of meal rates over time</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mealRateTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}`, "Meal Rate"]} />
                  <Legend />
                  <Line type="monotone" dataKey="value" name="Meal Rate" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthlyExpense">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Expenses</CardTitle>
              <CardDescription>Total expenses by month</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}`, "Amount"]} />
                  <Legend />
                  <Bar dataKey="value" name="Amount" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
