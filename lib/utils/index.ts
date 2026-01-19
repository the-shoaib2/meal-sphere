import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validates if a string is a valid UUID
 * @param id The string to validate
 * @returns boolean indicating if the string is a valid UUID
 */
export function isValidId(id: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
}

export function assertOnline() {
  if (typeof window !== 'undefined' && (window as any).__APP_OFFLINE) {
    throw new Error('No internet connection');
  }
}

/**
 * Handles navigation with route change event
 * @param href The target URL
 */
export function handleNavigation(href: string) {
  if (href.startsWith('/')) {
    window.dispatchEvent(new CustomEvent('routeChangeStart'));
    window.location.assign(href);
  } else {
    window.open(href, '_blank');
  }
}

/**
 * Clears local storage but preserves specific keys like theme
 */
export function clearLocalStorage() {
  if (typeof window === 'undefined') return;
  
  const keysToPreserve = ['meal-sphere-theme'];
  const preservedValues: Record<string, string | null> = {};
  
  // Save preserved values
  keysToPreserve.forEach(key => {
    preservedValues[key] = localStorage.getItem(key);
  });
  
  // Clear all storage
  localStorage.clear();
  
  // Restore preserved values
  keysToPreserve.forEach(key => {
    if (preservedValues[key]) {
      localStorage.setItem(key, preservedValues[key]!);
    }
  });
}
