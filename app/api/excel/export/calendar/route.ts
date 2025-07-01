import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { exportGroupCalendarToExcel } from "@/lib/excel-utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const year = parseInt(searchParams.get("year") || "", 10);
  const month = parseInt(searchParams.get("month") || "", 10);

  if (!roomId || isNaN(year) || isNaN(month)) {
    return NextResponse.json({ success: false, error: "Missing or invalid parameters" }, { status: 400 });
  }

  try {
    const { buffer, filename } = await exportGroupCalendarToExcel(roomId, year, month);
    const base64 = Buffer.from(buffer).toString("base64");
    return NextResponse.json({
      success: true,
      data: base64,
      filename,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 