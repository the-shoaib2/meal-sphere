"use client"

import ExcelImportExport from "@/components/excel/excel-import-export"
import { useActiveGroup } from "@/contexts/group-context"
import { ExcelSkeleton } from "@/components/excel/excel-skeleton"

export default function ExcelPage() {
  const { activeGroup, isLoading } = useActiveGroup()

  if (isLoading) {
    return <ExcelSkeleton />
  }

  return (
    <ExcelImportExport />
  )
}
