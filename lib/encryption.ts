import crypto from 'crypto';

// Dedicated encryption key (NOT NEXTAUTH_SECRET)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
const APP_SALT = 'mealsphere-encryption-v1'; // App-specific salt
const ALGORITHM = 'aes-256-gcm'; // Authenticated encryption

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY or NEXTAUTH_SECRET environment variable is required');
}

/**
 * Encrypts data using AES-256-GCM (authenticated encryption)
 * @param data - Any JSON-serializable data
 * @returns Encrypted string in format: iv:authTag:encrypted
 */
export function encryptData(data: any): string {
  try {
    // Derive key from ENCRYPTION_KEY
    const key = crypto.scryptSync(ENCRYPTION_KEY!, APP_SALT, 32);
    
    // Generate random IV
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt data
    const stringified = JSON.stringify(data);
    let encrypted = cipher.update(stringified, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Return IV:AuthTag:Encrypted
    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted
    ].join(':');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data encrypted with encryptData
 * Supports both new format (GCM with auth tag) and legacy format (CBC without auth tag)
 * @param encryptedString - Encrypted string from encryptData
 * @returns Decrypted data
 */
export function decryptData(encryptedString: string): any {
  try {
    // Parse encrypted string
    const parts = encryptedString.split(':');
    
    // New format: iv:authTag:encrypted (3 parts) - AES-256-GCM
    if (parts.length === 3) {
      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      // Derive key
      const key = crypto.scryptSync(ENCRYPTION_KEY!, APP_SALT, 32);
      
      // Create decipher for GCM
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    }
    
    // Legacy format: iv:encrypted (2 parts) - AES-256-CBC
    else if (parts.length === 2) {
      console.warn('Decrypting legacy format data - consider re-encrypting with new format');
      
      const [ivHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      
      // Use old algorithm and key derivation for legacy data
      const legacyKey = crypto.scryptSync(
        process.env.NEXTAUTH_SECRET || ENCRYPTION_KEY!,
        'salt', // Old hardcoded salt
        32
      );
      
      // Create decipher for CBC (legacy)
      const decipher = crypto.createDecipheriv('aes-256-cbc', legacyKey, iv);
      
      // Decrypt
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    }
    
    // Invalid format
    else {
      throw new Error(`Invalid encrypted data format: expected 2 or 3 parts, got ${parts.length}`);
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Securely hash sensitive data (one-way)
 * Use for data that needs to be compared but never decrypted
 */
export function hashData(data: string): string {
  return crypto
    .createHmac('sha256', ENCRYPTION_KEY!)
    .update(data)
    .digest('hex');
}
