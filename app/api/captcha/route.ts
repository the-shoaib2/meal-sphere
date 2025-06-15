import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createCanvas } from 'canvas';

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
function generateCaptchaText(length = 6): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate wave pattern for distortion
function generateWave(width: number, height: number, amplitude: number, frequency: number): number[] {
  const wave = [];
  for (let i = 0; i < width; i++) {
    wave.push(Math.sin(i / frequency) * amplitude);
  }
  return wave;
}

// Generate CAPTCHA image as PNG buffer
function generateCaptchaImage(text: string): { buffer: Buffer; mimeType: string } {
  const width = 200; // Increased width for better distortion
  const height = 80; // Increased height for better distortion
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Create gradient background with more contrast
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#e8e8e8');
  gradient.addColorStop(0.5, '#f8f8f8');
  gradient.addColorStop(1, '#e0e0e0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Generate wave patterns for distortion
  const wave1 = generateWave(width, height, 1.5, 15);
  const wave2 = generateWave(width, height, 2, 25);
  
  // Add warped grid pattern
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  const gridSize = 20;
  
  // Warped vertical lines
  for (let i = 0; i < width; i += gridSize) {
    ctx.beginPath();
    for (let y = 0; y <= height; y += 2) {
      const x = i + wave1[y % wave1.length] * 2 + wave2[y % wave2.length];
      if (y === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
  
  // Warped horizontal lines
  for (let i = 0; i < height; i += gridSize) {
    ctx.beginPath();
    for (let x = 0; x <= width; x += 2) {
      const y = i + wave1[x % wave1.length] + wave2[x % wave2.length] * 1.5;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
  
  // Add random dots
  for (let i = 0; i < 150; i++) {
    const size = Math.random() * 2;
    ctx.fillStyle = `rgba(${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(
      Math.random() * width,
      Math.random() * height,
      size,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  

  
  // Add diagonal lines in various directions and styles
  for (let i = 0; i < 12; i++) {
    // Random line style
    const lineWidth = Math.random() > 0.7 ? 2 : 1; // 30% chance of thicker line
    ctx.lineWidth = lineWidth;
    
    // Random opacity for more variety
    const opacity = 0.1 + Math.random() * 0.2; // 10-30% opacity
    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
    
    // Random start point anywhere on the canvas
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    
    // Random angle for the line
    const angle = Math.random() * Math.PI * 2; // 0-360 degrees in radians
    const length = Math.max(width, height) * 1.5; // Make sure line is long enough
    
    // Calculate end point based on angle and length
    const x2 = x1 + Math.cos(angle) * length;
    const y2 = y1 + Math.sin(angle) * length;
    
    // Draw the line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    
    // Add some curve to some lines (30% chance)
    if (Math.random() > 0.7) {
      const cp1x = x1 + (x2 - x1) * 0.3 + (Math.random() - 0.5) * 20;
      const cp1y = y1 + (y2 - y1) * 0.3 + (Math.random() - 0.5) * 20;
      const cp2x = x1 + (x2 - x1) * 0.7 + (Math.random() - 0.5) * 20;
      const cp2y = y1 + (y2 - y1) * 0.7 + (Math.random() - 0.5) * 20;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    } else {
      ctx.lineTo(x2, y2);
    }
    
    // Add a subtle shadow to some lines
    if (Math.random() > 0.8) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 2;
    }
    
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Add some dots at line ends (20% chance)
    if (Math.random() > 0.8) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(x1, y1, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.arc(x2, y2, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Generate wave pattern for text distortion
  const textWave = generateWave(text.length * 30, height, 8, 2);
  
  // Calculate maximum available width with padding (20px on each side)
  const maxWidth = width - 40;
  const startX = 20;
  
  // Calculate character width based on text length
  let baseFontSize = 40;
  let charWidth = baseFontSize * 0.8; // Initial estimate
  let totalWidth = text.length * charWidth;
  
  // Adjust font size if text is too wide
  if (totalWidth > maxWidth) {
    baseFontSize = Math.floor((maxWidth / text.length) * 1.2);
    charWidth = baseFontSize * 0.8;
  }
  
  // Set base font properties
  const fontStyle = Math.random() > 0.3 ? 'bold' : 'normal';
  const fontFamilies = ['Arial', 'Verdana', 'Tahoma', 'Impact', 'Courier New'];
  const fontFamily = fontFamilies[Math.floor(Math.random() * fontFamilies.length)];
  
  // Draw text with wave distortion and individual transformations
  for (let i = 0; i < text.length; i++) {
    ctx.save();
    
    // Random font size variation (±15% from base)
    const fontSize = baseFontSize * (0.85 + Math.random() * 0.3);
    ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
    
    // Apply wave distortion to y-position
    const waveOffset = textWave[i % textWave.length];
    const yBase = 55 + waveOffset;
    
    // Variable baseline with more aggressive variation
    const baselineShift = (Math.random() - 0.5) * 15; // More aggressive baseline shift
    const y = yBase + baselineShift;
    
    // More aggressive rotation (-25 to +25 degrees)
    const rotation = (Math.random() - 0.5) * 0.9; // -25 to +25 degrees
    
    // Random character scaling (80% to 120%)
    const scaleX = 0.8 + Math.random() * 0.4;
    const scaleY = 0.8 + Math.random() * 0.4;
    
    // Position with wave distortion
    const x = startX + (i * charWidth) + (i > 0 ? (Math.random() - 0.5) * 5 : 0);
    
    // Move to character position and apply transformations
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scaleX, scaleY);
    
    // Random color with slight variation
    const hue = Math.floor(Math.random() * 40) - 20; // -20 to +20 degrees from black
    const saturation = 70 + Math.random() * 30; // 70-100%
    const lightness = 20 + Math.random() * 20; // 20-40%
    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    
    // Draw character with shadow and distortion
    const drawCount = Math.random() > 0.4 ? 3 : 2; // 60% chance of 3 layers
    
    for (let j = 0; j < drawCount; j++) {
      // Add slight offset for each layer
      const offsetX = (Math.random() - 0.5) * 3;
      const offsetY = (Math.random() - 0.5) * 3;
      
      // Random skew for more distortion
      ctx.save();
      const skewX = (Math.random() - 0.5) * 0.2; // -0.1 to 0.1 skew
      const skewY = (Math.random() - 0.5) * 0.2;
      ctx.transform(1, skewY, skewX, 1, 0, 0);
      
      // Draw character with shadow
      if (j === 0) {
        // First layer: outline
        ctx.strokeStyle = `hsla(0, 0%, 0%, ${0.6 + Math.random() * 0.3})`;
        ctx.lineWidth = 1.5 + Math.random() * 1.5;
        ctx.strokeText(text[i], offsetX, offsetY);
      } else {
        // Additional layers: fill with slight offset
        ctx.fillText(text[i], offsetX, offsetY);
      }
      
      ctx.restore();
    }
    
    // Final character with main color
    ctx.fillText(text[i], 0, 0);
    
    ctx.restore();
  }
  

  
  // Return the image as a buffer
  const buffer = canvas.toBuffer('image/png');
  return { buffer, mimeType: 'image/png' };
}

// Handle GET request - Generate new CAPTCHA
export async function GET(request: NextRequest) {
  cleanupExpiredCaptchas();
  
  const sessionId = uuidv4();
  const code = generateCaptchaText();
  const expires = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  captchaStore.set(sessionId, { code, expires });
  
  const { buffer, mimeType } = generateCaptchaImage(code);
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      'X-Captcha-Session': sessionId,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

// Handle POST request - Verify CAPTCHA
export async function POST(request: NextRequest) {
  const { sessionId, userInput } = await request.json();
  
  if (!sessionId || !userInput) {
    return NextResponse.json(
      { isValid: false, message: 'Missing session ID or user input' },
      { status: 400 }
    );
  }
  
  const captchaData = captchaStore.get(sessionId);
  
  if (!captchaData) {
    return NextResponse.json(
      { isValid: false, message: 'Invalid or expired session' },
      { status: 400 }
    );
  }
  
  if (Date.now() > captchaData.expires) {
    captchaStore.delete(sessionId);
    return NextResponse.json(
      { isValid: false, message: 'CAPTCHA expired' },
      { status: 400 }
    );
  }
  
  const isValid = userInput.toUpperCase() === captchaData.code;
  captchaStore.delete(sessionId);
  
  return NextResponse.json({
    isValid,
    message: isValid ? 'CAPTCHA verified successfully' : 'Invalid CAPTCHA',
  });
}
