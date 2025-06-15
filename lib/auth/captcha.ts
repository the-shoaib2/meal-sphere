import * as svgCaptcha from 'svg-captcha';
import { v4 as uuidv4 } from 'uuid';

// In-memory store for CAPTCHA codes (use Redis in production)
const captchaStore = new Map<string, { code: string; expires: number }>();

// Clean up expired CAPTCHAs
function cleanupExpiredCaptchas() {
  const now = Date.now();
  for (const [key, value] of captchaStore.entries()) {
    if (value.expires <= now) {
      captchaStore.delete(key);
    }
  }
}

export function generateCaptcha() {
  try {
    // Clean up expired CAPTCHAs on each request
    cleanupExpiredCaptchas();
    
    // Generate CAPTCHA with simpler configuration
    const captcha = svgCaptcha.create({
      size: 4,
      noise: 1,
      color: true,
      background: '#f0f0f0',
      width: 120,
      height: 40,
      fontSize: 35,
      charPreset: '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ', // Exclude similar-looking characters
      ignoreChars: '0o1iIlL', // Exclude similar-looking characters
    });
    
    // Create a session ID for this CAPTCHA
    const sessionId = uuidv4();
    
    // Store CAPTCHA code (case-insensitive) with 1-minute expiration
    captchaStore.set(sessionId, {
      code: captcha.text.toLowerCase(),
      expires: Date.now() + 60000, // 1 minute
    });

    return {
      success: true,
      sessionId,
      captcha: captcha.data,
    };
  } catch (error) {
    console.error('CAPTCHA generation error:', error);
    return {
      success: false,
      error: 'Failed to generate CAPTCHA',
    };
  }
}

export async function validateCaptcha(sessionId: string, userInput: string): Promise<boolean> {
  const captcha = captchaStore.get(sessionId);
  
  // Remove the CAPTCHA after validation attempt
  captchaStore.delete(sessionId);
  
  if (!captcha) return false;
  if (captcha.expires < Date.now()) return false;
  
  return captcha.code === userInput.toLowerCase();
}
