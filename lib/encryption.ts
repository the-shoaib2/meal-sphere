import crypto from 'crypto';

// Use NEXTAUTH_SECRET for key derivation
const SECRET_KEY = crypto.scryptSync(process.env.NEXTAUTH_SECRET || '', 'salt', 32);
const ALGORITHM = 'aes-256-cbc';

export function encryptData(data: any): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  
  const stringified = JSON.stringify(data);
  let encrypted = cipher.update(stringified, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Return IV + Encrypted Data
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptData(encryptedString: string): any {
  const textParts = encryptedString.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = textParts.join(':');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}
