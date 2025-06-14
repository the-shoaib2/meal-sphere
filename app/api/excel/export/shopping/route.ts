import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../auth/[...nextauth]/route"
import { exportShoppingToExcel } from "@/lib/excel-utils"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get("roomId")
  const startDateParam = searchParams.get("startDate")
  const endDateParam = searchParams.get("endDate")

  if (!roomId) {
    return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
  }

  try {
    // Parse date range or use current month
    let startDate: Date
    let endDate: Date

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
    } else {
      // Default to current month
      const now = new Date()
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    const result = await exportShoppingToExcel(roomId, startDate, endDate)

    // Convert buffer to base64
    const base64 = Buffer.from(result.buffer).toString("base64")

    return NextResponse.json({
      success: true,
      filename: result.filename,
      data: base64,
    })
  } catch (error) {
    console.error("Error exporting shopping to Excel:", error)
    return NextResponse.json({ error: "Failed to export shopping to Excel" }, { status: 500 })
  }
}
