import { useState } from "react";
import { toast } from 'react-hot-toast';
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { 
  ExcelExportOptions, 
  ExcelImportOptions, 
  ExcelPermissionResult 
} from "@/types/excel";
import { getExcelPermissions } from "@/lib/excel/excel-permissions";
import { 
  exportExcelAction, 
  importExcelAction, 
  downloadTemplateAction 
} from "@/lib/actions/excel.actions";

/**
 * Hook for Excel import/export functionality with permission handling.
 */
export function useExcel(groupId?: string, userRole?: Role | null) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const { data: session } = useSession();

  const permissions = getExcelPermissions(userRole || null);

  const exportToExcel = async (options: ExcelExportOptions) => {
    if (!groupId) {
      toast.error("Please select a group first");
      return { success: false };
    }

    if (!permissions.canExport) {
      toast.error("You do not have permission to export data");
      return { success: false };
    }

    setIsExporting(true);
    try {
      const res = await exportExcelAction({
        roomId: groupId,
        ...options,
        startDate: options.startDate?.toISOString(),
        endDate: options.endDate?.toISOString(),
      });

      if (res.success && res.data) {
        const byteCharacters = atob(res.data as string);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = (res.filename as string) || "export.xlsx";
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Export successful");
        return { success: true };
      } else {
        throw new Error(res.error || "Export failed");
      }
    } catch (error: any) {
      toast.error(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsExporting(false);
    }
  };

  const importFromExcel = async (options: ExcelImportOptions) => {
    if (!groupId) {
      toast.error("Please select a group first");
      return { success: false };
    }

    if (!permissions.canImport) {
      toast.error("You do not have permission to import data");
      return { success: false };
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("roomId", groupId);
      formData.append("type", options.type);
      formData.append("file", options.file);

      const res = await importExcelAction(formData);
      if (res.success) {
        toast.success(`Imported ${res.importedRows} rows successfully`);
        return { success: true, importedRows: res.importedRows };
      } else {
        throw new Error(res.error || "Import failed");
      }
    } catch (error: any) {
      toast.error(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const res = await downloadTemplateAction();
      if (res.success && res.data) {
        const byteCharacters = atob(res.data as string);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = (res.filename as string) || "template.xlsx";
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Template downloaded");
      }
    } catch (error: any) {
      toast.error("Failed to download template");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  return {
    isExporting,
    isImporting,
    isDownloadingTemplate,
    permissions,
    exportToExcel,
    importFromExcel,
    downloadTemplate,
  };
}
