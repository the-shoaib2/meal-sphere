import { NextRequest, NextResponse } from 'next/server';
import { checkGroupAccess } from '@/lib/auth/group-auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Use the new group authentication system
    const authResult = await checkGroupAccess(id);

    return NextResponse.json({
      isMember: authResult.isMember,
      userRole: authResult.userRole,
      canAccess: authResult.canAccess,
      isAdmin: authResult.isAdmin,
      isCreator: authResult.isCreator,
      groupId: authResult.groupId,
      error: authResult.error
    });
  } catch (error) {
    console.error('Error checking group access:', error);
    return NextResponse.json(
      { error: 'Failed to check group access' },
      { status: 500 }
    );
  }
} 