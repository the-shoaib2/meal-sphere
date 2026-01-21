import { v4 as uuidv4 } from 'uuid';
import getRedisClient from '@/lib/services/redis';

// Generate a random string for CAPTCHA
function generateCaptchaText(length = 6): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate simple SVG CAPTCHA
function generateCaptchaSVG(text: string): string {
  const width = 200;
  const height = 80;
  const fontSize = 32;
  const charWidth = width / text.length;
  
  // Generate random colors
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  
  // Create SVG
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Background
  svg += `<rect width="${width}" height="${height}" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1"/>`;
  
  // Add noise dots
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const opacity = 0.1 + Math.random() * 0.3;
    svg += `<circle cx="${x}" cy="${y}" r="${1 + Math.random() * 2}" fill="${color}" opacity="${opacity}"/>`;
  }
  
  // Add noise lines
  for (let i = 0; i < 8; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const opacity = 0.1 + Math.random() * 0.2;
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" opacity="${opacity}"/>`;
  }
  
  // Add text characters
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = 20 + i * charWidth + (Math.random() - 0.5) * 10;
    const y = 50 + (Math.random() - 0.5) * 10;
    const rotation = (Math.random() - 0.5) * 30;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    svg += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}" transform="rotate(${rotation} ${x} ${y})" text-anchor="middle">${char}</text>`;
  }
  
  svg += '</svg>';
  return svg;
}

export async function createCaptcha() {
    const redis = getRedisClient();
    if (!redis) {
       // Fallback to simpler mechanism or error? 
       // For now, assume Redis is critical for security.
       throw new Error("Redis unavailable for Captcha");
    }

    const text = generateCaptchaText(6);
    const svg = generateCaptchaSVG(text);
    const captchaId = uuidv4();
    
    // Store in Redis with 5 minute expiration
    // We store the text keyed by the ID
    await redis.set(`captcha:${captchaId}`, text, 'EX', 300);
    
    return {
        id: captchaId,
        svg
    };
}

export async function verifyCaptcha(captchaId: string, userInput: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
        throw new Error("Redis unavailable");
    }

    // Get stored text
    const storedText = await redis.get(`captcha:${captchaId}`);
    
    if (!storedText) {
        return false;
    }
    
    const isValid = userInput.toUpperCase() === storedText.toUpperCase();
    
    if (isValid) {
        // Invalidate after successful use to prevent replay
        await redis.del(`captcha:${captchaId}`);
    }
    
    return isValid;
}
