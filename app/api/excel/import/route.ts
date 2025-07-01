import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { importMealsFromExcel, importShoppingFromExcel, importPaymentsFromExcel } from "@/lib/excel-utils"
import { getExcelPermissions, validateImportOptions } from "@/lib/excel-permissions"
import { ExcelImportType } from "@/types/excel"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const roomId = formData.get("roomId") as string
    const type = formData.get("type") as ExcelImportType
    const file = formData.get("file") as File

    if (!roomId || !type || !file) {
      return NextResponse.json({ error: "Room ID, type, and file are required" }, { status: 400 })
    }

    // Check if user is a member of the room
    const roomMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId,
        },
      },
    })

    if (!roomMember) {
      return NextResponse.json({ error: "You are not a member of this room" }, { status: 403 })
    }

    // Get user permissions
    const permissions = getExcelPermissions(roomMember.role)

    // Validate import options
    const validation = validateImportOptions({ type }, permissions)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 403 })
    }

    // Convert file to array buffer
    const buffer = await file.arrayBuffer()

    // Import data based on type
    let result: any

    switch (type) {
      case "meals":
        result = await importMealsFromExcel(roomId, buffer)
        break
      case "shopping":
        result = await importShoppingFromExcel(roomId, buffer)
        break
      case "payments":
        result = await importPaymentsFromExcel(roomId, buffer)
        break
      default:
        return NextResponse.json({ error: "Invalid import type" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      importedRows: result.importedRows || 0,
      totalRows: result.totalRows || 0,
      details: result.details || {
        successful: result.importedRows || 0,
        failed: 0,
        errors: [],
      },
    })
  } catch (error) {
    console.error("Error importing data from Excel:", error)
    return NextResponse.json({ error: "Failed to import data from Excel" }, { status: 500 })
  }
} 