import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notification-utils"
import { uploadReceipt } from "@/lib/upload-utils"
import { NotificationType } from "@prisma/client"
import { getPeriodAwareWhereClause, addPeriodIdToData, validateActivePeriod } from "@/lib/period-utils"
import { cacheGetOrSet } from "@/lib/cache-service"
import { getShoppingCacheKey, CACHE_TTL } from "@/lib/cache-keys"
import { invalidateShoppingCache } from "@/lib/cache-invalidation"


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Parse form data
    // Parse request data based on Content-Type
    const contentType = request.headers.get("content-type") || "";
    
    let roomId: string;
    let description: string;
    let amount: number;
    let date: Date;
    let receiptFile: File | null = null;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      roomId = body.roomId;
      description = body.description;
      amount = Number.parseFloat(body.amount);
      date = new Date(body.date);
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      roomId = formData.get("roomId") as string;
      description = formData.get("description") as string;
      amount = Number.parseFloat(formData.get("amount") as string);
      date = new Date(formData.get("date") as string);
      receiptFile = formData.get("receipt") as File | null;
    } else {
      return NextResponse.json({ message: "Unsupported Content-Type" }, { status: 415 });
    }

    // Validate data
    if (!roomId || !description || isNaN(amount) || !date) {
      return NextResponse.json({ message: "Invalid data provided" }, { status: 400 })
    }

    // Check if user is a member of the room
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        rooms: {
          where: { roomId },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (user.rooms.length === 0) {
      return NextResponse.json({ message: "You are not a member of this room" }, { status: 403 })
    }

    // Upload receipt if provided
    let receiptUrl = null
    if (receiptFile) {
      receiptUrl = await uploadReceipt(receiptFile, user.id, roomId)
    }

    // Validate that there's an active period
    try {
      await validateActivePeriod(roomId)
    } catch (error: any) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    // Create shopping item with period ID
    const shoppingData = await addPeriodIdToData(roomId, {
      name: description?.substring(0, 50) || 'Shopping Item', // Required field
      description,
      quantity: amount,
      date,
      receiptUrl,
      userId: user.id,
      roomId,
    })

    const shoppingItem = await prisma.shoppingItem.create({
      data: shoppingData,
    })

    // Get room details for notification
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    })

    // Create notifications for room members
    const roomMembers = await prisma.roomMember.findMany({
      where: {
        roomId,
        userId: {
          not: user.id, // Exclude the user who added the shopping item
        },
      },
      include: {
        user: true,
      },
    })

    for (const member of roomMembers) {
      await createNotification({
        userId: member.user.id,
        type: NotificationType.PAYMENT_CREATED,
        message: `${user.name} added a new shopping item of ${amount} for ${description} in ${room?.name}.`,
      })
    }

    // Invalidate cache
    const currentPeriod = await prisma.mealPeriod.findFirst({
        where: { roomId: roomId, status: 'ACTIVE' }
    });
    await invalidateShoppingCache(roomId, currentPeriod?.id);

    return NextResponse.json({
      message: "Shopping item added successfully",
      shoppingItem,
    })
  } catch (error) {
    console.error("Error adding shopping item:", error)
    return NextResponse.json({ message: "Failed to add shopping item" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")
    const periodId = searchParams.get("periodId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!roomId) {
      return NextResponse.json({ message: "Room ID is required" }, { status: 400 })
    }

    // Optimization: Run Auth Check and Period Filter generation in parallel
    // If periodId is provided, we don't strictly need getPeriodAwareWhereClause which looks for ACTIVE.
    // But we still need to verify the user is in the room.

    const [roomMember, activePeriodFilter] = await Promise.all([
      prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId: session.user.id,
            roomId: roomId,
          },
        },
      }),
      !periodId ? getPeriodAwareWhereClause(roomId, { roomId }) : Promise.resolve(null)
    ]);

    if (!roomMember) {
      return NextResponse.json({ message: "You are not a member of this room" }, { status: 403 })
    }

    let whereClause: any = { roomId };

    if (periodId) {
      // If periodId is explicit, use it.
      whereClause.periodId = periodId;
    } else {
      // Fallback to active period logic
      if ((activePeriodFilter as any)?.id === null) {
        return NextResponse.json([], {
          headers: { 'Cache-Control': 'private, s-maxage=60' }
        })
      }
      whereClause = { ...activePeriodFilter };
    }

    // Add date filter if provided
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const cacheKey = getShoppingCacheKey(roomId, periodId || (activePeriodFilter as any)?.id || 'active');
    
    // Get from cache or fetch from DB
    const shoppingItems = await cacheGetOrSet(
      cacheKey,
      async () => {
        return await prisma.shoppingItem.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        })
      },
      { ttl: CACHE_TTL.MEALS_LIST } // Using MEALS_LIST TTL (2 min) as similar data urgency
    );

    return NextResponse.json(shoppingItems, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error("Error fetching shopping items:", error)
    return NextResponse.json({ message: "Failed to fetch shopping items" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id, ...updateData } = await request.json()

    if (!id) {
      return NextResponse.json({ message: "Item ID is required" }, { status: 400 })
    }

    // Get the current item to verify ownership
    const currentItem = await prisma.shoppingItem.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            members: {
              where: { userId: session.user.id },
              select: { role: true }
            }
          }
        }
      }
    })

    if (!currentItem) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 })
    }

    // Check if user is a member of the room
    if (currentItem.room.members.length === 0) {
      return NextResponse.json({ message: "You are not a member of this room" }, { status: 403 })
    }

    // Only allow updating certain fields
    const allowedUpdates = ['name', 'quantity', 'unit', 'purchased']
    const updates = Object.keys(updateData).filter(key => allowedUpdates.includes(key))

    if (updates.length === 0) {
      return NextResponse.json({ message: "No valid updates provided" }, { status: 400 })
    }

    const updatePayload: any = {}
    updates.forEach(update => {
      updatePayload[update] = updateData[update]
    })

    // Update the item
    const updatedItem = await prisma.shoppingItem.update({
      where: { id },
      data: updatePayload,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    // Invalidate cache
    await invalidateShoppingCache(currentItem.room.id, currentItem.periodId || undefined);

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error("Error updating shopping item:", error)
    return NextResponse.json(
      { message: "Failed to update shopping item" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const groupId = searchParams.get("groupId")

    if (!id || !groupId) {
      return NextResponse.json(
        { message: "Item ID and Group ID are required" },
        { status: 400 }
      )
    }

    // Get the current item to verify ownership
    const currentItem = await prisma.shoppingItem.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            members: {
              where: { userId: session.user.id },
              select: { role: true }
            }
          }
        }
      }
    })

    if (!currentItem) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 })
    }

    // Check if user is a member of the room
    if (currentItem.room.members.length === 0) {
      return NextResponse.json({ message: "You are not a member of this room" }, { status: 403 })
    }

    // Delete the item
    await prisma.shoppingItem.delete({
      where: { id }
    })

    // Invalidate cache
    await invalidateShoppingCache(currentItem.room.id, currentItem.periodId || undefined);

    return NextResponse.json({ message: "Item deleted successfully" })
  } catch (error) {
    console.error("Error deleting shopping item:", error)
    return NextResponse.json(
      { message: "Failed to delete shopping item" },
      { status: 500 }
    )
  }
}
