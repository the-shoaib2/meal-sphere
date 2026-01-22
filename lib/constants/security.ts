/**
 * Security constants for the application
 */

// Bcrypt cost factor (12 = ~250ms on modern hardware)
export const BCRYPT_ROUNDS = 12;

// Password requirements
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// Session configuration
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
export const SESSION_UPDATE_AGE = 24 * 60 * 60; // 24 hours

// Rate limiting
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds

// Token expiry
export const PASSWORD_RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
export const EMAIL_VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// CSRF
export const CSRF_TOKEN_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds
