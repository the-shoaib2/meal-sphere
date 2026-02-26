"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/services/prisma";
import { cacheGetOrSet } from "@/lib/cache/cache-service";
import { getAnalyticsCacheKey, CACHE_TTL } from "@/lib/cache/cache-keys";
import { fetchAnalyticsData } from "@/lib/services/analytics-service";

async function getUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    if (!session?.user?.email) throw new Error("Unauthorized");
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("User not found");
    return user.id;
  }
  return session.user.id;
}

export async function getAnalyticsAction(groupId?: string | null) {
  try {
    const userId = await getUserId();
    const cacheKey = getAnalyticsCacheKey(groupId || "all", userId);

    return await cacheGetOrSet(
      cacheKey,
      async () => await fetchAnalyticsData(userId, { groupId: groupId || null }),
      { ttl: CACHE_TTL.ANALYTICS }
    );
  } catch (error: any) {
    console.error("Error in getAnalyticsAction:", error);
    throw new Error(error.message || "Failed to fetch analytics");
  }
}

export async function getUserRoomsAction() {
  try {
    const userId = await getUserId();

    const userWithRooms = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        rooms: {
          include: {
            room: {
              select: {
                id: true,
                name: true,
                _count: {
                  select: { members: true },
                },
              },
            },
          },
        },
      },
    });

    if (!userWithRooms) throw new Error("User not found");

    return userWithRooms.rooms.map((membership) => ({
      id: membership.room.id,
      name: membership.room.name,
      memberCount: membership.room._count.members,
    }));
  } catch (error: any) {
    console.error("Error in getUserRoomsAction:", error);
    throw new Error(error.message || "Failed to fetch user rooms");
  }
}

export async function getSelectedRoomsAnalyticsAction(roomIdsStr: string) {
  try {
    const userId = await getUserId();
    if (!roomIdsStr) throw new Error("Room IDs are required");
    
    const requestRoomIds = roomIdsStr.split(',').filter(id => id.trim() !== '');
    if (requestRoomIds.length === 0) throw new Error("No valid room IDs provided");

    return await fetchAnalyticsData(userId, { roomIds: requestRoomIds });
  } catch (error: any) {
    console.error("Error in getSelectedRoomsAnalyticsAction:", error);
    throw new Error(error.message || "Failed to fetch selected rooms analytics");
  }
}

export async function getRoomAnalyticsAction(roomId: string) {
  try {
    const userId = await getUserId();
    if (!roomId) throw new Error("Room ID is required");

    return await fetchAnalyticsData(userId, { groupId: roomId });
  } catch (error: any) {
    console.error("Error in getRoomAnalyticsAction:", error);
    throw new Error(error.message || "Failed to fetch room analytics");
  }
}

export async function getAllRoomsAnalyticsAction() {
  try {
    const userId = await getUserId();
    return await fetchAnalyticsData(userId, { groupId: null });
  } catch (error: any) {
    console.error("Error in getAllRoomsAnalyticsAction:", error);
    throw new Error(error.message || "Failed to fetch all rooms analytics");
  }
}
