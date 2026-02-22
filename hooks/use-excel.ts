import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useActiveGroup } from "@/contexts/group-context"
import { useSession } from "next-auth/react"
import {
  ExcelExportOptions,
  ExcelImportOptions,
  ExcelExportType,
  ExcelExportScope,
  ExcelDateRange,
  ExcelPermissionResult
} from "@/types/excel"
import { getExcelPermissions } from "@/lib/excel/excel-permissions"
import { Role } from "@prisma/client"
import { exportExcelAction, importExcelAction, downloadTemplateAction } from "@/lib/actions/excel.actions"

export function useExcel() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const { toast } = useToast()
  const { activeGroup } = useActiveGroup()
  const { data: session } = useSession()

  // Get user permissions
  const permissions = getExcelPermissions(activeGroup?.members?.find(m => m.userId === session?.user?.id)?.role as Role | null)

  const exportToExcel = async ({
    type,
    scope = 'user',
    dateRange = 'month',
    startDate,
    endDate,
    userId
  }: ExcelExportOptions) => {
    if (!activeGroup?.id) {
      toast({
        title: "No group selected",
        description: "Please select a group to export data from",
        variant: "destructive",
      })
      return { success: false, error: "No group selected" }
    }

    // Validate permissions
    const validation = validateExportOptions({ type, scope }, permissions)
    if (!validation.valid) {
      toast({
        title: "Permission denied",
        description: validation.error,
        variant: "destructive",
      })
      return { success: false, error: validation.error }
    }

    setIsExporting(true)

    try {
      const data = await exportExcelAction({
        roomId: activeGroup.id,
        type,
        scope,
        dateRange,
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        userId
      })

      if (data.success) {
        // Convert base64 to blob
        const byteCharacters = atob(data.data as string)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })

        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = (data.filename as string) || "export.xlsx"
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Export successful",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} data has been exported to Excel`,
        })

        return { success: true, filename: data.filename }
      } else {
        throw new Error(data.error || "Failed to export data")
      }
    } catch (error) {
      console.error(`Error exporting ${type}:`, error)
      const errorMessage = error instanceof Error ? error.message : "Failed to export data"

      toast({
        title: "Export failed",
        description: `Failed to export ${type} data. Please try again.`,
        variant: "destructive",
      })

      return { success: false, error: errorMessage }
    } finally {
      setIsExporting(false)
    }
  }

  const importFromExcel = async ({ type, file }: ExcelImportOptions) => {
    if (!activeGroup?.id) {
      toast({
        title: "No group selected",
        description: "Please select a group to import data to",
        variant: "destructive",
      })
      return { success: false, error: "No group selected" }
    }

    // Validate permissions
    const validation = validateImportOptions({ type }, permissions)
    if (!validation.valid) {
      toast({
        title: "Permission denied",
        description: validation.error,
        variant: "destructive",
      })
      return { success: false, error: validation.error }
    }

    setIsImporting(true)

    try {
      const formData = new FormData()
      formData.append("roomId", activeGroup.id)
      formData.append("type", type)
      formData.append("file", file)

      const data = await importExcelAction(formData)

      if (data.success) {
        toast({
          title: "Import successful",
          description: `Imported ${data.importedRows} rows from ${data.totalRows} total rows`,
        })

        return {
          success: true,
          importedRows: data.importedRows,
          totalRows: data.totalRows
        }
      } else {
        throw new Error(data.error || "Failed to import data")
      }
    } catch (error) {
      console.error("Error importing data:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to import data"

      toast({
        title: "Import failed",
        description: "Failed to import data. Please check your file and try again.",
        variant: "destructive",
      })

      return { success: false, error: errorMessage }
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = async () => {
    setIsDownloadingTemplate(true)

    try {
      const data = await downloadTemplateAction()

      if (data.success) {
        // Convert base64 to blob
        const byteCharacters = atob(data.data as string)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })

        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = (data.filename as string) || "template.xlsx"
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Template downloaded",
          description: "The import template has been downloaded",
        })

        return { success: true, filename: data.filename }
      } else {
        throw new Error(data.error || "Failed to download template")
      }
    } catch (error) {
      console.error("Error downloading template:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to download template"

      toast({
        title: "Download failed",
        description: "Failed to download template. Please try again.",
        variant: "destructive",
      })

      return { success: false, error: errorMessage }
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  // Helper function to validate export options
  const validateExportOptions = (
    options: { type: ExcelExportType; scope: ExcelExportScope },
    permissions: ExcelPermissionResult
  ): { valid: boolean; error?: string } => {
    // Check if user can export
    if (!permissions.canExport) {
      return { valid: false, error: 'You do not have permission to export data' }
    }

    // Check if export type is allowed
    if (!permissions.allowedExportTypes.includes(options.type)) {
      return { valid: false, error: `You do not have permission to export ${options.type} data` }
    }

    // Check scope permissions
    if (options.scope === 'all' && !permissions.canExportAll) {
      return { valid: false, error: 'You do not have permission to export all data' }
    }

    if (options.scope === 'individual' && !permissions.canExportIndividual) {
      return { valid: false, error: 'You do not have permission to export individual user data' }
    }

    return { valid: true }
  }

  // Helper function to validate import options
  const validateImportOptions = (
    options: { type: string },
    permissions: ExcelPermissionResult
  ): { valid: boolean; error?: string } => {
    // Check if user can import
    if (!permissions.canImport) {
      return { valid: false, error: 'You do not have permission to import data' }
    }

    // Check if import type is allowed
    if (!permissions.allowedImportTypes.includes(options.type as any)) {
      return { valid: false, error: `You do not have permission to import ${options.type} data` }
    }

    return { valid: true }
  }

  return {
    // State
    isExporting,
    isImporting,
    isDownloadingTemplate,
    activeGroup,
    permissions,

    // Actions
    exportToExcel,
    importFromExcel,
    downloadTemplate,

    // Utilities
    hasActiveGroup: !!activeGroup?.id,
    canExport: permissions.canExport,
    canImport: permissions.canImport,
    canExportAll: permissions.canExportAll,
    canExportUser: permissions.canExportUser,
    canExportIndividual: permissions.canExportIndividual,
    allowedExportTypes: permissions.allowedExportTypes,
    allowedImportTypes: permissions.allowedImportTypes,
    isPrivileged: permissions.isPrivileged,
  }
} 