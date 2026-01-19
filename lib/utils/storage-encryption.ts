
// Simple encryption utility for local storage
// Not for sensitive security, but for obfuscation as requested.

const ENCRYPTION_Key = 'ms_enc_v1';

export function encryptData(data: string): string {
  try {
    if (typeof window === 'undefined') return data;
    // Encode Unicode characters to UTF-8, then Base64
    const utf8Data = encodeURIComponent(data);
    return btoa(`${ENCRYPTION_Key}:${utf8Data}`);
  } catch (e) {
    console.error('Encryption failed', e);
    return data;
  }
}

export function decryptData(encryptedData: string): string {
  try {
    if (typeof window === 'undefined') return encryptedData;
    const decoded = atob(encryptedData);
    const [key, utf8Data] = decoded.split(':');
    if (key !== ENCRYPTION_Key) {
      console.warn('Invalid encryption key');
      return encryptedData;
    }
    // Decode UTF-8 back to Unicode
    return decodeURIComponent(utf8Data);
  } catch (e) {
    console.error('Decryption failed', e);
    return encryptedData;
  }
}
