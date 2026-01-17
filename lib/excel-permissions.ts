import { Role } from '@prisma/client'
import {
  PRIVILEGED_ROLES,
  EXPORT_ALLOWED_ROLES,
  IMPORT_ALLOWED_ROLES,
  ExcelExportType,
  ExcelImportType,
  ExcelPermissionResult
} from '@/types/excel'

/**
 * Check if a user has privileged access (Admin, Manager, Meal Manager)
 */
export function isPrivileged(role?: Role | null): boolean {
  return !!role && PRIVILEGED_ROLES.includes(role)
}

/**
 * Check if a user can export data
 */
export function canExport(role?: Role | null): boolean {
  return !!role && EXPORT_ALLOWED_ROLES.includes(role)
}

/**
 * Check if a user can import data
 */
export function canImport(role?: Role | null): boolean {
  return !!role && IMPORT_ALLOWED_ROLES.includes(role)
}

/**
 * Get allowed export types based on user role
 */
export function getAllowedExportTypes(role?: Role | null): ExcelExportType[] {
  if (!role) return []

  if (isPrivileged(role)) {
    return ['meals', 'shopping', 'payments', 'expenses', 'balances', 'calculations', 'all']
  }

  if (canExport(role)) {
    return ['meals', 'shopping', 'payments'] // Members can export their own data
  }

  return []
}

/**
 * Get allowed import types based on user role
 */
export function getAllowedImportTypes(role?: Role | null): ExcelImportType[] {
  if (!role) return []

  if (canImport(role)) {
    return ['meals', 'shopping', 'payments']
  }

  return []
}

/**
 * Check if user can export all data (group-wide)
 */
export function canExportAll(role?: Role | null): boolean {
  return isPrivileged(role)
}

/**
 * Check if user can export individual user data
 */
export function canExportIndividual(role?: Role | null): boolean {
  return isPrivileged(role)
}

/**
 * Check if user can export their own data
 */
export function canExportUser(role?: Role | null): boolean {
  return canExport(role)
}

/**
 * Get comprehensive Excel permissions for a user
 */
export function getExcelPermissions(role?: Role | null): ExcelPermissionResult {
  const isPrivilegedUser = isPrivileged(role)

  return {
    canExport: canExport(role),
    canImport: canImport(role),
    canExportAll: canExportAll(role),
    canExportUser: canExportUser(role),
    canExportIndividual: canExportIndividual(role),
    allowedExportTypes: getAllowedExportTypes(role),
    allowedImportTypes: getAllowedImportTypes(role),
    userRole: role || null,
    isPrivileged: isPrivilegedUser,
  }
}

/**
 * Validate export options based on user permissions
 */
export function validateExportOptions(
  options: { type: ExcelExportType; scope: 'all' | 'user' | 'individual' },
  permissions: ExcelPermissionResult
): { valid: boolean; error?: string } {
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

/**
 * Validate import options based on user permissions
 */
export function validateImportOptions(
  options: { type: ExcelImportType },
  permissions: ExcelPermissionResult
): { valid: boolean; error?: string } {
  // Check if user can import
  if (!permissions.canImport) {
    return { valid: false, error: 'You do not have permission to import data' }
  }

  // Check if import type is allowed
  if (!permissions.allowedImportTypes.includes(options.type)) {
    return { valid: false, error: `You do not have permission to import ${options.type} data` }
  }

  return { valid: true }
} 