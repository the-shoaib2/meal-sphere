import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { cleanupExpiredCaptchas, storeCaptcha, validateCaptcha } from '@/lib/captcha-store';
import getRedisClient from '@/lib/services/redis';

export const dynamic = 'force-dynamic';


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

export async function GET(request: NextRequest) {
  try {
    // Clean up expired CAPTCHAs
  cleanupExpiredCaptchas();
  
    // Generate new CAPTCHA
    const text = generateCaptchaText(6);
    const svg = generateCaptchaSVG(text);
    const captchaId = uuidv4();
    
    // Return SVG CAPTCHA with embedded validation data
    return new NextResponse(svg, {
      status: 200,
    headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
        'X-Captcha-ID': captchaId,
        'X-Captcha-Text': text // Embed the text for validation
      }
    });
  } catch (error) {
    console.error('Error generating CAPTCHA:', error);
    return NextResponse.json(
      { error: 'Failed to generate CAPTCHA' },
      { status: 500 }
    );
  }
  }
  
export async function POST(request: NextRequest) {
  try {
    const { captchaId, userInput, captchaText } = await request.json();
  
    if (!captchaId || !userInput || !captchaText) {
    return NextResponse.json(
        { error: 'Missing captchaId, userInput, or captchaText' },
      { status: 400 }
    );
  }
  
    // Validate CAPTCHA directly
    const isValid = userInput.toUpperCase() === captchaText.toUpperCase();

    return NextResponse.json({
      valid: isValid,
      message: isValid ? 'CAPTCHA verified successfully' : 'Invalid CAPTCHA'
    });
  } catch (error) {
    console.error('Error verifying CAPTCHA:', error);
    return NextResponse.json(
      { error: 'Failed to verify CAPTCHA' },
      { status: 500 }
    );
  }
}
