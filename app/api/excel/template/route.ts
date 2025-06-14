import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import { generateMealImportTemplate } from "@/lib/excel-template"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = generateMealImportTemplate()

    // Convert buffer to base64
    const base64 = Buffer.from(result.buffer).toString("base64")

    return NextResponse.json({
      success: true,
      filename: result.filename,
      data: base64,
    })
  } catch (error) {
    console.error("Error generating template:", error)
    return NextResponse.json({ error: "Failed to generate template" }, { status: 500 })
  }
}
