import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { PeriodService } from '@/lib/services/period-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    
    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { newName, withData = false } = body;
    const periodId = resolvedParams.id;


    const newPeriod = await PeriodService.restartPeriod(groupId, session.user.id, periodId, newName, withData);

    return NextResponse.json({ 
      message: 'Period restarted successfully',
      period: newPeriod 
    });

  } catch (error: any) {
    
    // Handle specific error types
    if (error.message?.includes('Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    if (error.message?.includes('not found') || error.message?.includes('Period not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    if (error.message?.includes('already an active period') || error.message?.includes('active')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A period with this name already exists. Please choose a different name.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to restart period' },
      { status: 500 }
    );
  }
} 