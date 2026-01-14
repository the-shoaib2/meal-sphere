import { prisma } from "@/lib/prisma"

/**
 * Gets the current group ID for a user
 * @param userId The user ID
 * @returns The current group ID or null if not found
 */
export async function getCurrentGroupId(userId: string): Promise<string | null> {
    try {
        const currentGroup = await prisma.roomMember.findFirst({
            where: {
                userId,
                isCurrent: true
            },
            select: {
                roomId: true
            }
        });

        return currentGroup?.roomId || null;
    } catch (error) {
        console.error('Error getting current group ID:', error);
        return null;
    }
}
