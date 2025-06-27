import TextToSVG from 'text-to-svg';
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

// Generate a random string for CAPTCHA
function generateRandomString(length: number): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateCaptcha() {
  try {
    // Clean up expired CAPTCHAs on each request
    cleanupExpiredCaptchas();
    
    // Generate random text
    const text = generateRandomString(4);
    
    // Create SVG
    const textToSVG = TextToSVG.loadSync();
    const options = {
      x: 0,
      y: 0,
      fontSize: 35,
      anchor: 'top',
      attributes: {
        fill: '#000',
        stroke: '#000',
        'stroke-width': 0.5
      }
    };
    
    const svg = textToSVG.getSVG(text, options);
    
    // Create a session ID for this CAPTCHA
    const sessionId = uuidv4();
    
    // Store CAPTCHA code (case-insensitive) with 1-minute expiration
    captchaStore.set(sessionId, {
      code: text.toLowerCase(),
      expires: Date.now() + 60000, // 1 minute
    });

    return {
      success: true,
      sessionId,
      captcha: svg,
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
