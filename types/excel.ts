import { Role } from '@prisma/client'

// Excel Export Types
export type ExcelExportType = 'meals' | 'shopping' | 'payments' | 'expenses' | 'balances' | 'calculations' | 'all'
export type ExcelExportScope = 'all' | 'user' | 'individual'
export type ExcelDateRange = 'day' | 'week' | 'month' | 'custom'

// Excel Export Options
export interface ExcelExportOptions {
  type: ExcelExportType
  scope: ExcelExportScope
  dateRange: ExcelDateRange
  startDate?: Date
  endDate?: Date
  userId?: string // For individual user exports
}

// Excel Import Types
export type ExcelImportType = 'meals' | 'shopping' | 'payments'

export interface ExcelImportOptions {
  type: ExcelImportType
  file: File
}

// Role-based Access Control
export const PRIVILEGED_ROLES: Role[] = ['ADMIN', 'MANAGER', 'MEAL_MANAGER']
export const EXPORT_ALLOWED_ROLES: Role[] = ['ADMIN', 'MANAGER', 'MEAL_MANAGER', 'MEMBER']
export const IMPORT_ALLOWED_ROLES: Role[] = ['ADMIN', 'MANAGER', 'MEAL_MANAGER']

export interface ExcelPermissionResult {
  canExport: boolean
  canImport: boolean
  canExportAll: boolean
  canExportUser: boolean
  canExportIndividual: boolean
  allowedExportTypes: ExcelExportType[]
  allowedImportTypes: ExcelImportType[]
  userRole: Role | null
  isPrivileged: boolean
}

// API Response Types
export interface ExcelExportResponse {
  success: boolean
  filename?: string
  data?: string // base64 encoded file
  error?: string
  exportedRows?: number
  dateRange?: {
    startDate: string
    endDate: string
  }
}

export interface ExcelImportResponse {
  success: boolean
  importedRows?: number
  totalRows?: number
  error?: string
  details?: {
    successful: number
    failed: number
    errors: string[]
  }
}

export interface ExcelTemplateResponse {
  success: boolean
  filename?: string
  data?: string // base64 encoded file
  error?: string
}

// Excel Data Types
export interface MealExcelRow {
  Date: string
  Name: string
  Breakfast: number
  Lunch: number
  Dinner: number
  Total: number
}

export interface ShoppingExcelRow {
  Date: string
  Description: string
  Amount: number
  AddedBy: string
}

export interface PaymentExcelRow {
  Date: string
  Name: string
  Amount: number
  Method: string
  Status: string
}

// Utility Types
export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface ExcelOperationResult {
  success: boolean
  message?: string
  error?: string
  data?: any
} 