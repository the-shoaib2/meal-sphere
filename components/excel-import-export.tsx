"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon, Download, FileUp, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ExcelImportExport() {
  const [selectedRoom, setSelectedRoom] = useState("")
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [endDate, setEndDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { toast } = useToast()

  // Sample data - would come from API
  const rooms = [
    { id: "room-1", name: "Apartment 303" },
    { id: "room-2", name: "Hostel Block B" },
  ]

  const handleExport = async (type: "meals" | "shopping" | "payments") => {
    if (!selectedRoom) {
      toast({
        title: "Room required",
        description: "Please select a room to export data from",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)

    try {
      const response = await fetch(
        `/api/excel/export/${type}?roomId=${selectedRoom}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      )

      if (!response.ok) {
        throw new Error("Failed to export data")
      }

      const data = await response.json()

      if (data.success) {
        // Convert base64 to blob
        const byteCharacters = atob(data.data)
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
        a.download = data.filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Export successful",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} data has been exported to Excel`,
        })
      } else {
        throw new Error(data.error || "Failed to export data")
      }
    } catch (error) {
      console.error(`Error exporting ${type}:`, error)
      toast({
        title: "Export failed",
        description: `Failed to export ${type} data. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleImport = async () => {
    if (!selectedRoom) {
      toast({
        title: "Room required",
        description: "Please select a room to import data to",
        variant: "destructive",
      })
      return
    }

    if (!selectedFile) {
      toast({
        title: "File required",
        description: "Please select an Excel file to import",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)

    try {
      const formData = new FormData()
      formData.append("roomId", selectedRoom)
      formData.append("file", selectedFile)

      const response = await fetch("/api/excel/import/meals", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to import data")
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Import successful",
          description: `Imported ${data.importedMeals} meals from ${data.totalRows} rows`,
        })
        setSelectedFile(null)
        // Reset the file input
        const fileInput = document.getElementById("excel-file") as HTMLInputElement
        if (fileInput) {
          fileInput.value = ""
        }
      } else {
        throw new Error(data.error || "Failed to import data")
      }
    } catch (error) {
      console.error("Error importing meals:", error)
      toast({
        title: "Import failed",
        description: "Failed to import meal data. Please check your file and try again.",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/excel/template")

      if (!response.ok) {
        throw new Error("Failed to download template")
      }

      const data = await response.json()

      if (data.success) {
        // Convert base64 to blob
        const byteCharacters = atob(data.data)
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
        a.download = data.filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Template downloaded",
          description: "The import template has been downloaded",
        })
      } else {
        throw new Error(data.error || "Failed to download template")
      }
    } catch (error) {
      console.error("Error downloading template:", error)
      toast({
        title: "Download failed",
        description: "Failed to download template. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Excel Import/Export</h2>
        <p className="text-muted-foreground">Import and export meal data in Excel format</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Selection</CardTitle>
          <CardDescription>Select the room and date range for import/export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room">Room</Label>
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger id="room">
                <SelectValue placeholder="Select a room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="export">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>Export your meal data to Excel format</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Export your meal, shopping, or payment data for the selected room and date range. The data will be
                downloaded as an Excel file.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => handleExport("meals")}
                disabled={isExporting || !selectedRoom}
                className="w-full sm:w-auto"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Meals
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleExport("shopping")}
                disabled={isExporting || !selectedRoom}
                className="w-full sm:w-auto"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Shopping
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleExport("payments")}
                disabled={isExporting || !selectedRoom}
                className="w-full sm:w-auto"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Payments
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Data</CardTitle>
              <CardDescription>Import meal data from Excel format</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Import meal data from an Excel file. The file should have columns for Date, Name, Breakfast, Lunch, and
                Dinner. The values for meals should be 1 (present) or 0 (absent).
              </p>
              <div className="space-y-2">
                <Label htmlFor="excel-file">Excel File</Label>
                <Input id="excel-file" type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
              </div>
              {selectedFile && <p className="text-sm text-muted-foreground">Selected file: {selectedFile.name}</p>}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleImport}
                disabled={isImporting || !selectedRoom || !selectedFile}
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
                    Import Meals
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import Template</CardTitle>
              <CardDescription>Download a template for meal data import</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Download a template Excel file to use for importing meal data. Fill in the template with your data and
                then import it using the form above.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
