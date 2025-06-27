interface LocationData {
  city?: string
  country?: string
  latitude?: number
  longitude?: number
  ipAddress?: string
}

// Check if IP is localhost or private
function isPrivateIP(ip: string): boolean {
  if (!ip) return true
  
  // Handle IPv6 localhost
  if (ip === '::1' || ip === 'localhost') return true
  
  // Handle IPv4 localhost
  if (ip === '127.0.0.1') return true
  
  // Handle private IP ranges
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^fc00::/,                  // Unique local addresses
    /^fe80::/                   // Link-local addresses
  ]
  
  return privateRanges.some(range => range.test(ip))
}

export async function detectLocation(): Promise<LocationData> {
  try {
    // Get IP address from a public service
    const ipResponse = await fetch('https://api.ipify.org?format=json')
    const ipData = await ipResponse.json()
    const ipAddress = ipData.ip

    // Check if it's a private IP
    if (isPrivateIP(ipAddress)) {
      return {
        ipAddress,
        city: 'Local Development',
        country: 'Development Environment',
        latitude: undefined,
        longitude: undefined,
      }
    }

    // Get location data from IP
    const locationResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`)
    const locationData = await locationResponse.json()

    return {
      ipAddress,
      city: locationData.city || undefined,
      country: locationData.country_name || undefined,
      latitude: locationData.latitude || undefined,
      longitude: locationData.longitude || undefined,
    }
  } catch (error) {
    console.error('Error detecting location:', error)
    return {}
  }
}

export async function getLocationFromIP(ipAddress: string): Promise<LocationData> {
  try {
    // Check if it's a private IP
    if (isPrivateIP(ipAddress)) {
      return {
        ipAddress,
        city: 'Local Development',
        country: 'Development Environment',
        latitude: undefined,
        longitude: undefined,
      }
    }

    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`)
    const data = await response.json()

    return {
      ipAddress,
      city: data.city || undefined,
      country: data.country_name || undefined,
      latitude: data.latitude || undefined,
      longitude: data.longitude || undefined,
    }
  } catch (error) {
    console.error('Error getting location from IP:', error)
    return { ipAddress }
  }
}

export function formatLocation(city?: string, country?: string): string {
  if (city && country) {
    return `${city}, ${country}`
  } else if (city) {
    return city
  } else if (country) {
    return country
  }
  return 'Unknown Location'
} 