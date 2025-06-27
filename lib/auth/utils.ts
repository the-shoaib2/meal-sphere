import { UAParser } from 'ua-parser-js';
import { ClientInfo, DeviceInfo, LocationData } from './types';

// Utility function to extract client info from request
export function extractClientInfo(req: any): ClientInfo {
  let userAgent = '';
  let ipAddress = '';

  if (req) {
    userAgent = req.headers?.['user-agent'] || '';

    // Try multiple headers for IP address
    ipAddress = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers?.['x-real-ip'] ||
      req.headers?.['cf-connecting-ip'] || // Cloudflare
      req.headers?.['x-client-ip'] ||
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      '';
  }

  // Clean up IP address (remove IPv6 prefix if present)
  if (ipAddress && ipAddress.startsWith('::ffff:')) {
    ipAddress = ipAddress.substring(7);
  }

  return { userAgent, ipAddress };
}

// Helper function to get current session token from request
export function getCurrentSessionToken(request: any): string | null {
  return request.cookies?.get('next-auth.session-token')?.value ||
    request.cookies?.get('__Secure-next-auth.session-token')?.value ||
    null;
}

// Parse device information from user agent
export function parseDeviceInfo(userAgent: string): DeviceInfo {
  const parser = new UAParser(userAgent);
  const device = parser.getDevice();
  const os = parser.getOS();
  const browser = parser.getBrowser();
  
  // Better device type detection
  const deviceType = device.type || 
                    (userAgent.toLowerCase().includes('mobile') ? 'mobile' : 
                     userAgent.toLowerCase().includes('tablet') ? 'tablet' : 'desktop');
  
  // Better device model detection with fallbacks
  let deviceModel = '';
  if (device.vendor && device.model) {
    deviceModel = `${device.vendor} ${device.model}`.trim();
  } else if (device.model) {
    deviceModel = device.model;
  } else if (os.name) {
    deviceModel = `${os.name} ${os.version || ''}`.trim();
  } else if (browser.name) {
    deviceModel = `${browser.name} ${browser.version || ''}`.trim();
  }

  return {
    deviceType: deviceType || 'desktop',
    deviceModel: deviceModel || '',
    browser: browser.name ? `${browser.name} ${browser.version || ''}`.trim() : undefined,
    os: os.name ? `${os.name} ${os.version || ''}`.trim() : undefined
  };
} 