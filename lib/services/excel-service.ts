import { prisma } from "@/lib/services/prisma"
import { 
  exportMealsToExcel, 
  exportShoppingToExcel, 
  exportPaymentsToExcel, 
  generateMealPreviewTable, 
  exportExpensesToExcel, 
  exportBalancesToExcel, 
  generateBalancePreview, 
  generateCalculationPreview, 
  exportDataToPDF, 
  exportAllDataToExcel,
  importMealsFromExcel,
  importShoppingFromExcel,
  importPaymentsFromExcel
} from "@/lib/excel/excel-utils"
import { getExcelPermissions, validateExportOptions, validateImportOptions } from "@/lib/excel/excel-permissions"
import { generateMealImportTemplate } from "@/lib/excel/excel-template"
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { ExcelExportType, ExcelExportScope, ExcelDateRange, ExcelImportType } from "@/types/excel"

export type ExportRequest = {
  roomId: string;
  userId?: string | null;
  type: ExcelExportType;
  scope: ExcelExportScope;
  dateRange: ExcelDateRange;
  startDate?: string; // ISO string
  endDate?: string;
  preview?: boolean;
  format?: 'excel' | 'pdf';
  userRole: string; // Caller must provide role for permission check
}

export type ImportRequest = {
  roomId: string;
  type: ExcelImportType;
  fileBuffer: ArrayBuffer;
  userRole: string;
}

export async function processExport(request: ExportRequest) {
  const { roomId, userId, type, scope, dateRange, startDate: startStr, endDate: endStr, preview, format = 'excel', userRole } = request;

  // Permission Check
  const permissions = getExcelPermissions(userRole as any);
  const validation = validateExportOptions({ type, scope }, permissions);
  
  if (!validation.valid) {
    throw new Error(validation.error || "Permission denied");
  }

  // Calculate Dates
  let startDate: Date;
  let endDate: Date;

  if (startStr && endStr) {
    startDate = new Date(startStr);
    endDate = new Date(endStr);
  } else {
    const now = new Date();
    switch (dateRange) {
      case "day":
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case "week":
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }
  }

  // PREVIEW LOGIC
  if (preview) {
      if (type === "all") {
        // We trigger generation to populate preview tables inside utils if needed, or re-implement preview fetching
        // The original route called export functions AND generated previews. 
        // We will just generate previews here to be faster.
        const [mealPreviewTable, shoppingResult, paymentsResult] = await Promise.all([
             generateMealPreviewTable(roomId, startDate, endDate, scope, userId || undefined),
             exportShoppingToExcel(roomId, startDate, endDate, scope, userId || undefined),
             exportPaymentsToExcel(roomId, startDate, endDate, scope, userId || undefined)
        ]) as any;

        const [header, ...rows] = mealPreviewTable;
        const mealPreviewRows = rows.map((row: any) => Object.fromEntries(header.map((key: any, i: any) => [key, row[i]])));
        
        const expenses = await prisma.extraExpense.findMany({
            where: {
                roomId,
                date: { gte: startDate, lte: endDate }
            },
            include: { user: { select: { name: true } } },
            orderBy: { date: "asc" }
        });
        
        const expenseRows = expenses.map(e => ({
            Date: e.date.toISOString().split("T")[0],
            Name: e.user?.name || "",
            Amount: e.amount,
            Description: e.description || ""
        }));

        const [balanceRows, calculationRows] = await Promise.all([
             generateBalancePreview(roomId, startDate, endDate, scope, userId || undefined),
             generateCalculationPreview(roomId, startDate, endDate, scope, userId || undefined)
        ]);

        return {
             preview: {
                 meals: mealPreviewRows,
                 shopping: shoppingResult.rows,
                 payments: paymentsResult.rows,
                 expenses: expenseRows,
                 balances: balanceRows,
                 calculations: calculationRows
             }
        };

      } else if (type === "meals") {
          const table = await generateMealPreviewTable(roomId, startDate, endDate, scope, userId || undefined);
          const [header, ...rows] = table;
          return { preview: rows.map((row: any) => Object.fromEntries(header.map((key: any, i: any) => [key, row[i]]))) };
      } else if (type === "shopping") {
          const res = await exportShoppingToExcel(roomId, startDate, endDate, scope, userId || undefined);
          return { preview: res.rows };
      } else if (type === "payments") {
          const res = await exportPaymentsToExcel(roomId, startDate, endDate, scope, userId || undefined);
          return { preview: res.rows };
      } else if (type === "expenses") {
          const expenses = await prisma.extraExpense.findMany({
              where: { roomId, date: { gte: startDate, lte: endDate } },
              include: { user: { select: { name: true } } },
              orderBy: { date: "asc" }
          });
          return { 
             preview: expenses.map(e => ({
                 Date: e.date.toISOString().split("T")[0],
                 Name: e.user?.name || "",
                 Amount: e.amount,
                 Description: e.description || ""
             }))
          };
      } else if (type === "balances") {
          const rows = await generateBalancePreview(roomId, startDate, endDate, scope, userId || undefined);
          return { preview: rows };
      }
      return { preview: [] };
  }

  // EXPORT LOGIC
  let result: any;
  if (type === "all") {
      if (format === 'excel') {
          result = await exportAllDataToExcel(roomId, startDate, endDate, scope, userId || undefined);
      } else {
          result = await exportDataToPDF(roomId, startDate, endDate, scope, userId || undefined, type);
      }
  } else {
      if (format === 'pdf') {
          result = await exportDataToPDF(roomId, startDate, endDate, scope, userId || undefined, type);
      } else {
          switch (type) {
              case "meals": result = await exportMealsToExcel(roomId, startDate, endDate, scope, userId || undefined); break;
              case "shopping": result = await exportShoppingToExcel(roomId, startDate, endDate, scope, userId || undefined); break;
              case "payments": result = await exportPaymentsToExcel(roomId, startDate, endDate, scope, userId || undefined); break;
              case "expenses": result = await exportExpensesToExcel(roomId, startDate, endDate, scope, userId || undefined); break;
              case "balances": result = await exportBalancesToExcel(roomId, startDate, endDate, scope, userId || undefined); break;
              default: throw new Error("Invalid export type");
          }
      }
  }

  // Standardize buffer return
  let finalBuffer: Buffer;
  // logic to normalize buffer...
  if (Buffer.isBuffer(result.buffer)) {
      finalBuffer = result.buffer;
  } else if (result.buffer instanceof ArrayBuffer) {
      finalBuffer = Buffer.from(new Uint8Array(result.buffer));
  } else if (Array.isArray(result.buffer)) {
      finalBuffer = Buffer.from(result.buffer);
  } else {
      finalBuffer = Buffer.from(result.buffer); // Attempt generic conversion
  }

  // Get Room name for filename
  const room = await prisma.room.findUnique({where: {id: roomId}, select: {name: true}});
  const roomName = room?.name || "Export";
  const filename = result.filename || `${roomName}_${type}_${formatDateForFilename(startDate)}_to_${formatDateForFilename(endDate)}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;

  return {
     buffer: finalBuffer,
     filename,
     contentType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
}

export async function processImport(request: ImportRequest) {
    const { roomId, type, fileBuffer, userRole } = request;

    const permissions = getExcelPermissions(userRole as any);
    const validation = validateImportOptions({ type }, permissions);
    if (!validation.valid) {
        throw new Error(validation.error || "Permission denied");
    }

    let result: any;
    switch (type) {
      case "meals":
        result = await importMealsFromExcel(roomId, fileBuffer);
        break;
      case "shopping":
        result = await importShoppingFromExcel(roomId, fileBuffer);
        break;
      case "payments":
        result = await importPaymentsFromExcel(roomId, fileBuffer);
        break;
      default:
        throw new Error("Invalid import type");
    }

    return {
      success: true,
      importedRows: result.importedRows || 0,
      totalRows: result.totalRows || 0,
      details: result.details
    };
}

export async function getTemplate() {
    const result = generateMealImportTemplate();
    return {
        filename: result.filename,
        buffer: result.buffer
    };
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0];
}
