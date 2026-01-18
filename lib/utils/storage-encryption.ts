
// Simple encryption utility for local storage
// Not for sensitive security, but for obfuscation as requested.

const ENCRYPTION_Key = 'ms_secure_store_v1';

export function encryptData(data: string): string {
  try {
    if (typeof window === 'undefined') return data;
    // Simple Base64 encoding + salt for obfuscation
    return btoa(`${ENCRYPTION_Key}:${data}`);
  } catch (e) {
    console.error('Encryption failed', e);
    return data;
  }
}

export function decryptData(encryptedData: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const decoded = atob(encryptedData);
    if (decoded.startsWith(`${ENCRYPTION_Key}:`)) {
      return decoded.replace(`${ENCRYPTION_Key}:`, '');
    }
    return null;
  } catch (e) {
    console.error('Decryption failed', e);
    return null;
  }
}
