import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      })
    }

    const userSessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        sessionToken: true,
        userId: true,
        expires: true,
      },
    })

    return NextResponse.json(userSessions)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
    })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      })
    }

    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid session IDs' }), {
        status: 400,
      })
    }

    await prisma.session.deleteMany({
      where: {
        id: {
          in: ids,
        },
        userId: session.user.id,
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error revoking sessions:', error)
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
    })
  }
}
