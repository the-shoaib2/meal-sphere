import { NextRequest, NextResponse } from 'next/server'
import { detectLocation } from '@/lib/location-utils'

export async function GET(request: NextRequest) {
  try {
    const location = await detectLocation()
    return NextResponse.json(location)
  } catch (error) {
    console.error('Error detecting location:', error)
    return NextResponse.json({ error: 'Failed to detect location' }, { status: 500 })
  }
} 