"use client"
import { Toaster } from "react-hot-toast"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export function ToastProvider() {
  const baseStyle = {
    background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 'var(--radius)',
    // padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  }
  
  // Explicit color values for better visibility
  const colors = {
    success: '#10B981', // Green-500
    error: '#EF4444',   // Red-500
    loading: '#3B82F6'  // Blue-500
  }

  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: baseStyle,
        success: {
          duration: 3000,
          style: {
            ...baseStyle,
          },
          icon: <CheckCircle className="h-4 w-4" style={{ color: colors.success }} />,
        },
        error: {
          duration: 4000,
          style: {
            ...baseStyle,
          },
          icon: <XCircle className="h-4 w-4" style={{ color: colors.error }} />,
        },
        loading: {
          style: {
            ...baseStyle,
          },
          icon: <Loader2 className="h-4 w-4 animate-spin" style={{ color: colors.loading }} />,
        },
      }}
    />
  )
}
