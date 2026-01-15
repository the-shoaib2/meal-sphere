"use client"

import ExcelImportExport from "@/components/excel/excel-import-export"
import { useActiveGroup } from "@/contexts/group-context"
import { ExcelSkeleton } from "@/components/excel/excel-skeleton"
import { NoGroupState } from "@/components/empty-states/no-group-state"
import { useGroups } from "@/hooks/use-groups"

export default function ExcelPage() {
  const { activeGroup, isLoading } = useActiveGroup()
  const { data: userGroups = [], isLoading: isLoadingGroups } = useGroups();

  // Check if user has no groups - show empty state
  if (!isLoadingGroups && userGroups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Excel Import/Export</h1>
            <p className="text-muted-foreground text-sm">
              Import and export data in Excel format
            </p>
          </div>
        </div>
        <NoGroupState />
      </div>
    );
  }

  if (isLoading) {
    return <ExcelSkeleton />
  }

  return (
    <ExcelImportExport />
  )
}
