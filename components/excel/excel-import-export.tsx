"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { CalendarIcon, Download, FileUp, Loader2, Users, User, Shield } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useExcel } from "@/hooks/use-excel"
import { ExcelSkeleton } from "@/components/excel/excel-skeleton"
import { ExcelPreviewSkeleton } from "@/components/excel/excel-skeleton"
import { ExcelExportType, ExcelExportScope, ExcelDateRange, ExcelImportType } from "@/types/excel"
import { useToast } from "@/hooks/use-toast"
import ExportDataSelection from "@/components/excel/export-data-selection"
import { Progress } from "@/components/ui/progress"
import PreviewTable from "@/components/excel/template/preview-table"

export default function ExcelImportExport() {
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [endDate, setEndDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [exportType, setExportType] = useState<ExcelExportType>("meals")
  const [exportScope, setExportScope] = useState<ExcelExportScope>("user")
  const [dateRange, setDateRange] = useState<ExcelDateRange>("month")
  const [importType, setImportType] = useState<ExcelImportType>("meals")
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [showPreview, setShowPreview] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadFormat, setDownloadFormat] = useState<'excel' | 'pdf'>('excel')
  const [previewData, setPreviewData] = useState<any>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  const {
    isExporting,
    isImporting,
    isDownloadingTemplate,
    activeGroup,
    permissions,
    exportToExcel,
    importFromExcel,
    downloadTemplate,
    hasActiveGroup,
    canExport,
    canImport,
    canExportAll,
    canExportUser,
    canExportIndividual,
    allowedExportTypes,
    allowedImportTypes,
    isPrivileged,
  } = useExcel()

  const { toast } = useToast()

  // Handle date range changes
  const handleDateRangeChange = (newDateRange: ExcelDateRange) => {
    setDateRange(newDateRange)
    const now = new Date()

    switch (newDateRange) {
      case "day":
        setStartDate(startOfDay(now))
        setEndDate(endOfDay(now))
        break
      case "week":
        setStartDate(startOfWeek(now, { weekStartsOn: 1 }))
        setEndDate(endOfWeek(now, { weekStartsOn: 1 }))
        break
      case "month":
        setStartDate(startOfMonth(now))
        setEndDate(endOfMonth(now))
        break
      case "custom":
        // Keep current dates for custom range
        break
    }
  }

  const handleExport = async () => {
    setShowPreview(false)
    setIsPreviewLoading(true)
    setPreviewData(null)
    try {
      if (!activeGroup) throw new Error('No active group')
      const params = new URLSearchParams({
        roomId: activeGroup.id,
        type: exportType,
        scope: exportScope,
        dateRange,
        preview: "true",
      })
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())
      if (selectedUserId) params.append('userId', selectedUserId)
      const response = await fetch(`/api/excel/export?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        setPreviewData(data.preview)
        console.log("Preview data received:", data.preview)
        setShowPreview(true)
      } else {
        toast({ title: "Preview failed", description: data.error || "Failed to load preview", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Preview failed", description: "Failed to load preview", variant: "destructive" })
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleDownload = async (format: 'excel' | 'pdf') => {
    setIsDownloading(true)
    setDownloadFormat(format)
    await exportToExcel({
      type: exportType,
      scope: exportScope,
      dateRange,
      startDate,
      endDate,
      userId: selectedUserId || undefined
    })
    setIsDownloading(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    const result = await importFromExcel({ type: importType, file: selectedFile })

    if (result.success) {
      setSelectedFile(null)
      // Reset the file input
      const fileInput = document.getElementById("excel-file") as HTMLInputElement
      if (fileInput) {
        fileInput.value = ""
      }
    }
  }

  const handleDownloadTemplate = async () => {
    await downloadTemplate()
  }

  // Show skeleton while loading
  if (!hasActiveGroup) {
    return <ExcelSkeleton />
  }

  // Show message if no active group
  if (!activeGroup) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Excel Import/Export</h2>
          <p className="text-muted-foreground">Import and export meal data in Excel format</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground text-center">
              No group selected. Please select a group to use Excel import/export features.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Excel Import/Export</h2>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-muted-foreground">
            Import and export meal data in Excel format for <strong>{activeGroup?.name}</strong>
          </p>
          {permissions.userRole && (
            <Badge variant={isPrivileged ? "default" : "outline"} className="text-xs">
              {permissions.userRole}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="export">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export" disabled={!canExport}>Export Data</TabsTrigger>
          <TabsTrigger value="import" disabled={!canImport}>Import Data</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4 mt-4">
          <ExportDataSelection
            exportType={exportType}
            setExportType={setExportType}
            exportScope={exportScope}
            setExportScope={setExportScope}
            dateRange={dateRange}
            handleDateRangeChange={handleDateRangeChange}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
            allowedExportTypes={allowedExportTypes}
            canExportUser={canExportUser}
            canExportAll={canExportAll}
            canExportIndividual={canExportIndividual}
            activeGroup={activeGroup}
            isExporting={isExporting}
            canExport={canExport}
            onExport={handleExport}
            exportScopeValue={exportScope}
            selectedUserIdValue={selectedUserId}
          />

          {/* Preview and Download Section */}
          {(isPreviewLoading || (showPreview && canExport)) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeGroup?.name || "Group"}
                </CardTitle>
                <CardDescription>
                  Export preview for {activeGroup?.name || "Group"} —
                  {dateRange === 'month' && (
                    <> {format(startDate, 'MMMM yyyy')}</>
                  )}
                  {dateRange === 'week' && (
                    <> {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}</>
                  )}
                  {dateRange === 'day' && (
                    <> {format(startDate, 'PPP')}</>
                  )}
                  {dateRange === 'custom' && (
                    <> {format(startDate, 'PPP')} - {format(endDate, 'PPP')}</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPreviewLoading && <ExcelPreviewSkeleton />}
                {!isPreviewLoading && showPreview && previewData && (
                  <>
                    {/* Render preview tables for each type */}
                    {exportType === 'all' && previewData && typeof previewData === 'object' ? (
                      <>
                        {(
                          (!previewData.meals || previewData.meals.length === 0) &&
                          (!previewData.shopping || previewData.shopping.length === 0) &&
                          (!previewData.payments || previewData.payments.length === 0) &&
                          (!previewData.expenses || previewData.expenses.length === 0) &&
                          (!previewData.balances || previewData.balances.length === 0) &&
                          (!previewData.calculations || previewData.calculations.length === 0)
                        ) ? (
                          <div className="text-muted-foreground mb-4">No data found for the selected filters.</div>
                        ) : (
                          <>
                            {/* Show summary of available data */}
                            <div className="mb-4 p-3 bg-muted rounded-lg">
                              <h4 className="font-medium mb-2">Available Data:</h4>
                              <div className="flex flex-wrap gap-2">
                                {previewData.meals && previewData.meals.length > 0 && (
                                  <Badge variant="default">Meals ({previewData.meals.length})</Badge>
                                )}
                                {previewData.shopping && previewData.shopping.length > 0 && (
                                  <Badge variant="default">Shopping ({previewData.shopping.length})</Badge>
                                )}
                                {previewData.payments && previewData.payments.length > 0 && (
                                  <Badge variant="default">Payments ({previewData.payments.length})</Badge>
                                )}
                                {previewData.expenses && previewData.expenses.length > 0 && (
                                  <Badge variant="default">Expenses ({previewData.expenses.length})</Badge>
                                )}
                                {previewData.balances && previewData.balances.length > 0 && (
                                  <Badge variant="default">Balances ({previewData.balances.length})</Badge>
                                )}
                                {previewData.calculations && previewData.calculations.length > 0 && (
                                  <Badge variant="default">Calculations ({previewData.calculations.length})</Badge>
                                )}
                              </div>
                            </div>
                            
                            {previewData.meals && Array.isArray(previewData.meals) && previewData.meals.length > 0 && (
                              <PreviewTable title="Meals" rows={previewData.meals} />
                            )}
                            {previewData.shopping && Array.isArray(previewData.shopping) && previewData.shopping.length > 0 && (
                              <PreviewTable title="Shopping" rows={previewData.shopping} />
                            )}
                            {previewData.payments && Array.isArray(previewData.payments) && previewData.payments.length > 0 && (
                              <PreviewTable title="Payments" rows={previewData.payments} />
                            )}
                            {previewData.expenses && Array.isArray(previewData.expenses) && previewData.expenses.length > 0 && (
                              <PreviewTable title="Expenses" rows={previewData.expenses} />
                            )}
                            {previewData.balances && Array.isArray(previewData.balances) && previewData.balances.length > 0 && (
                              <PreviewTable title="Balances" rows={previewData.balances} />
                            )}
                            {previewData.calculations && Array.isArray(previewData.calculations) && previewData.calculations.length > 0 && (
                              <PreviewTable title="Calculations" rows={previewData.calculations} />
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <PreviewTable title={exportType.charAt(0).toUpperCase() + exportType.slice(1)} rows={previewData} />
                    )}
                    <div className="flex gap-4 mt-4">
                      <Button
                        variant="default"
                        onClick={() => handleDownload('excel')}
                        disabled={isDownloading}
                      >
                        {isDownloading && downloadFormat === 'excel' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Download as Excel
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDownload('pdf')}
                        disabled={isDownloading}
                      >
                        {isDownloading && downloadFormat === 'pdf' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Download as PDF
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="import" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Data</CardTitle>
              <CardDescription>Import data from Excel format</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Import data from an Excel file. Make sure the file format matches the template.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Import Type</Label>
                  <Select value={importType} onValueChange={(value: ExcelImportType) => setImportType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select import type" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedImportTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Excel File</Label>
                  <Input id="excel-file" type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
                </div>
              </div>

              {selectedFile && <p className="text-sm text-muted-foreground">Selected file: {selectedFile.name}</p>}

              {!canImport && (
                <p className="text-sm text-destructive">
                  You do not have permission to import data to this group.
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleImport}
                disabled={isImporting || !canImport || !selectedFile}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" />
                    Import Data
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import Template</CardTitle>
              <CardDescription>Download a template for data import</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Download a template Excel file to use for importing data. Fill in the template with your data and
                then import it using the form above.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
              >
                {isDownloadingTemplate ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
