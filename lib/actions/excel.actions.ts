"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import prisma from "@/lib/services/prisma";
import { 
  exportMealsToExcel, exportShoppingToExcel, exportPaymentsToExcel, 
  generateMealPreviewTable, exportExpensesToExcel, exportBalancesToExcel, 
  generateBalancePreview, generateCalculationPreview, exportDataToPDF, 
  exportAllDataToExcel 
} from "@/lib/excel/excel-utils";
import { getExcelPermissions, validateExportOptions, validateImportOptions } from "@/lib/excel/excel-permissions";
import { ExcelExportType, ExcelExportScope, ExcelDateRange, ExcelImportType } from "@/types/excel";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { importMealsFromExcel, importShoppingFromExcel, importPaymentsFromExcel } from "@/lib/excel/excel-utils";
import { generateMealImportTemplate } from "@/lib/excel/excel-template";

async function getUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    if (!session?.user?.email) throw new Error("Unauthorized");
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");
    return user.id;
  }
  return session.user.id;
}

export async function exportExcelAction(params: {
  roomId: string;
  type: ExcelExportType;
  scope: ExcelExportScope;
  dateRange: ExcelDateRange;
  startDate?: string;
  endDate?: string;
  userId?: string;
  format?: string;
  preview?: boolean;
}) {
  try {
    const userId = await getUserId();
    const { roomId, type, scope, dateRange, startDate: startDateParam, endDate: endDateParam, userId: targetUserId, format = "excel", preview = false } = params;

    if (!roomId || !type || !scope || !dateRange) {
      throw new Error("Room ID, type, scope, and dateRange are required");
    }

    const roomMember = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
      include: {
        room: { include: { members: { include: { user: { select: { id: true, name: true } } } } } }
      }
    });

    if (!roomMember) throw new Error("You are not a member of this room");

    const permissions = getExcelPermissions(roomMember.role as any);
    const validation = validateExportOptions({ type, scope }, permissions);
    if (!validation.valid) throw new Error(validation.error);

    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      const now = new Date();
      switch (dateRange) {
        case "day": startDate = startOfDay(now); endDate = endOfDay(now); break;
        case "week": startDate = startOfWeek(now, { weekStartsOn: 1 }); endDate = endOfWeek(now, { weekStartsOn: 1 }); break;
        case "month": startDate = startOfMonth(now); endDate = endOfMonth(now); break;
        default: startDate = startOfMonth(now); endDate = endOfMonth(now);
      }
    }

    if (preview) {
      if (type === "all") {
        const [mealsResult, shoppingResult, paymentsResult] = await Promise.all([
          exportMealsToExcel(roomId, startDate, endDate, scope, targetUserId || undefined),
          exportShoppingToExcel(roomId, startDate, endDate, scope, targetUserId || undefined),
          exportPaymentsToExcel(roomId, startDate, endDate, scope, targetUserId || undefined),
        ]);
        const mealPreviewTable = await generateMealPreviewTable(roomId, startDate, endDate, scope, targetUserId || undefined);
        const [header, ...rows] = mealPreviewTable;
        const mealPreviewRows = rows.map(row => Object.fromEntries(header.map((key, i) => [key, row[i]])));
        
        const expenses = await prisma.extraExpense.findMany({
          where: { roomId, date: { gte: startDate, lte: endDate } },
          include: { user: { select: { name: true } } },
          orderBy: { date: "asc" },
        });
        const expenseRows = expenses.map(e => ({
          Date: e.date.toISOString().split("T")[0], Name: e.user?.name || "", Amount: e.amount, Description: e.description || "",
        }));

        const [balanceRows, calculationRows] = await Promise.all([
          generateBalancePreview(roomId, startDate, endDate, scope, targetUserId || undefined),
          generateCalculationPreview(roomId, startDate, endDate, scope, targetUserId || undefined),
        ]);
        return {
          success: true,
          preview: {
            meals: mealPreviewRows, shopping: shoppingResult.rows, payments: paymentsResult.rows, 
            expenses: expenseRows, balances: balanceRows, calculations: calculationRows,
          },
        };
      } else if (type === "meals") {
        const previewTable = await generateMealPreviewTable(roomId, startDate, endDate, scope, targetUserId || undefined);
        const [header, ...rows] = previewTable;
        return { success: true, preview: rows.map(row => Object.fromEntries(header.map((key, i) => [key, row[i]]))) };
      } else if (type === "shopping") {
        const res = await exportShoppingToExcel(roomId, startDate, endDate, scope, targetUserId || undefined);
        return { success: true, preview: res.rows };
      } else if (type === "payments") {
        const res = await exportPaymentsToExcel(roomId, startDate, endDate, scope, targetUserId || undefined);
        return { success: true, preview: res.rows };
      } else if (type === "expenses") {
        const expenses = await prisma.extraExpense.findMany({
          where: { roomId, date: { gte: startDate, lte: endDate } },
          include: { user: { select: { name: true } } },
          orderBy: { date: "asc" },
        });
        return { success: true, preview: expenses.map(e => ({
          Date: e.date.toISOString().split("T")[0], Name: e.user?.name || "", Amount: e.amount, Description: e.description || "",
        })) };
      } else if (type === "balances") {
        const res = await generateBalancePreview(roomId, startDate, endDate, scope, targetUserId || undefined);
        return { success: true, preview: res };
      } else {
        return { success: true, preview: [] };
      }
    }

    let result: any;
    if (type === "all" && format === "excel") {
      result = await exportAllDataToExcel(roomId, startDate, endDate, scope, targetUserId || undefined);
    } else if (type === "all" && format === "pdf") {
      result = await exportDataToPDF(roomId, startDate, endDate, scope, targetUserId || undefined, type);
    } else if (type === "all") {
       // Should be covered by above, but fallback
       result = await exportAllDataToExcel(roomId, startDate, endDate, scope, targetUserId || undefined);
    } else {
      if (format === 'pdf') {
        result = await exportDataToPDF(roomId, startDate, endDate, scope, targetUserId || undefined, type);
      } else {
        switch (type) {
          case "meals": result = await exportMealsToExcel(roomId, startDate, endDate, scope, targetUserId || undefined); break;
          case "shopping": result = await exportShoppingToExcel(roomId, startDate, endDate, scope, targetUserId || undefined); break;
          case "payments": result = await exportPaymentsToExcel(roomId, startDate, endDate, scope, targetUserId || undefined); break;
          case "expenses": result = await exportExpensesToExcel(roomId, startDate, endDate, scope, targetUserId || undefined); break;
          case "balances": result = await exportBalancesToExcel(roomId, startDate, endDate, scope, targetUserId || undefined); break;
          default: throw new Error("Invalid export type");
        }
      }
    }

    let buffer: Buffer;
    if (Buffer.isBuffer(result.buffer)) buffer = result.buffer;
    else if (result.buffer instanceof ArrayBuffer) buffer = Buffer.from(new Uint8Array(result.buffer));
    else if (Array.isArray(result.buffer)) buffer = Buffer.from(result.buffer);
    else if (result.buffer && result.buffer.buffer instanceof ArrayBuffer) buffer = Buffer.from(result.buffer);
    else throw new Error('Invalid buffer type returned from export function');

    return {
      success: true,
      filename: result.filename,
      data: buffer.toString('base64')
    };

  } catch (error: any) {
    console.error("Error exporting data to Excel:", error);
    return { success: false, error: error.message || "Failed to export data to Excel" };
  }
}

export async function importExcelAction(formData: FormData) {
  try {
    const userId = await getUserId();
    const roomId = formData.get("roomId") as string;
    const type = formData.get("type") as ExcelImportType;
    const file = formData.get("file") as File;

    if (!roomId || !type || !file) {
      throw new Error("Room ID, type, and file are required");
    }

    const roomMember = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } }
    });

    if (!roomMember) throw new Error("You are not a member of this room");

    const permissions = getExcelPermissions(roomMember.role as any);
    const validation = validateImportOptions({ type }, permissions);
    if (!validation.valid) throw new Error(validation.error);

    const buffer = await file.arrayBuffer();

    let result: any;
    switch (type) {
      case "meals": result = await importMealsFromExcel(roomId, buffer); break;
      case "shopping": result = await importShoppingFromExcel(roomId, buffer); break;
      case "payments": result = await importPaymentsFromExcel(roomId, buffer); break;
      default: throw new Error("Invalid import type");
    }

    return {
      success: true,
      importedRows: result.importedRows || 0,
      totalRows: result.totalRows || 0,
      details: result.details || { successful: result.importedRows || 0, failed: 0, errors: [] },
    };
  } catch (error: any) {
    console.error("Error importing data from Excel:", error);
    return { success: false, error: error.message || "Failed to import data from Excel" };
  }
}

export async function downloadTemplateAction() {
  try {
    // Auth check just to be safe
    await getUserId();
    
    const result = generateMealImportTemplate();
    const base64 = Buffer.from(result.buffer).toString("base64");

    return {
      success: true,
      filename: result.filename,
      data: base64,
    };
  } catch (error: any) {
    console.error("Error generating template:", error);
    return { success: false, error: error.message || "Failed to generate template" };
  }
}
