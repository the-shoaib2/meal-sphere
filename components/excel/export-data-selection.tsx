import React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, User, Users, Shield } from "lucide-react"
import { format } from "date-fns"
import { ExcelExportType, ExcelExportScope, ExcelDateRange } from "@/types/excel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ExcelExportDataSelectionCardProps {
  exportType: ExcelExportType
  setExportType: (type: ExcelExportType) => void
  exportScope: ExcelExportScope
  setExportScope: (scope: ExcelExportScope) => void
  dateRange: ExcelDateRange
  handleDateRangeChange: (range: ExcelDateRange) => void
  startDate: Date
  setStartDate: (date: Date) => void
  endDate: Date
  setEndDate: (date: Date) => void
  selectedUserId: string
  setSelectedUserId: (id: string) => void
  allowedExportTypes: ExcelExportType[]
  canExportUser: boolean
  canExportAll: boolean
  canExportIndividual: boolean
  activeGroup: any
  isExporting: boolean
  canExport: boolean
  onExport: () => void
  exportScopeValue: string
  selectedUserIdValue: string
}

const ExportDataSelection: React.FC<ExcelExportDataSelectionCardProps> = ({
  exportType,
  setExportType,
  exportScope,
  setExportScope,
  dateRange,
  handleDateRangeChange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedUserId,
  setSelectedUserId,
  allowedExportTypes,
  canExportUser,
  canExportAll,
  canExportIndividual,
  activeGroup,
  isExporting,
  canExport,
  onExport,
  exportScopeValue,
  selectedUserIdValue,
}) => (
  <Card className="w-full">
    <CardHeader>
      <CardTitle className="text-base sm:text-lg">Data Selection</CardTitle>
      <CardDescription className="text-xs sm:text-sm">Select the export options and date range</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div className="space-y-2">
          <Label>Export Type</Label>
          <Select value={exportType} onValueChange={setExportType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select export type" />
            </SelectTrigger>
            <SelectContent>
              {allowedExportTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Export Scope</Label>
          <Select value={exportScope} onValueChange={setExportScope}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select export scope" />
            </SelectTrigger>
            <SelectContent>
              {canExportUser && (
                <SelectItem value="user">
                  <User className="h-4 w-4 mr-2" />
                  My Data
                </SelectItem>
              )}
              {canExportAll && (
                <SelectItem value="all">
                  <Users className="h-4 w-4 mr-2" />
                  All Data
                </SelectItem>
              )}
              {canExportIndividual && (
                <SelectItem value="individual">
                  <Shield className="h-4 w-4 mr-2" />
                  Individual User
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        <div className="space-y-2">
          <Label>Date Range</Label>
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
      {exportScope === "individual" && canExportIndividual && (
        <div className="space-y-2">
          <Label>Select User</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent className="max-h-60 w-full overflow-y-auto">
              {activeGroup?.members?.map((member: any) => (
                <SelectItem key={member.userId} value={member.userId}>
                  <span className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.user.image || undefined} alt={member.user.name} />
                      <AvatarFallback>{member.user.name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <span>{member.user.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {/* Export Button */}
      <div className="pt-2 w-full">
        <Button
          onClick={onExport}
          disabled={isExporting || !canExport || (exportScopeValue === "individual" && !selectedUserIdValue)}
          className="w-full"
        >
          {isExporting ? (
            <>
              <span className="mr-2"><svg className="animate-spin h-4 w-4 inline" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></span>
              Exporting...
            </>
          ) : (
            <>Export</>
          )}
        </Button>
      </div>
    </CardContent>
  </Card>
)

export default ExportDataSelection 